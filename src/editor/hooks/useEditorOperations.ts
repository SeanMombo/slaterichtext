import { useCallback, useState, useRef } from 'react';
import { Editor, Element as SlateElement, Point, Range, Transforms, Descendant } from 'slate';
import type { CustomEditor, BadgeElement } from '../SlateEditor.d';
import { encrypt, decrypt } from '../../utils/encryption';

function isBadgeElement(node: unknown): node is BadgeElement {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type?: string }).type === 'badge'
  );
}

export const useEditorOperations = (editor: CustomEditor, initialValue: Descendant[]) => {
  const [value, setValue] = useState<Descendant[]>(initialValue);

  // Helper function to expand selection to include entire badges at edges
  const expandSelectionToIncludeBadges = useCallback(() => {
    const { selection } = editor;
    if (!selection) return selection;

    const [start, end] = Editor.edges(editor, selection);
    const isForward = Point.isBefore(selection.anchor, selection.focus);

    // Check both start and end points for badges
    let newStart = start;
    let newEnd = end;

    // Check start point
    const [startNode, startPath] = Editor.node(editor, start);
    if (SlateElement.isElement(startNode) && isBadgeElement(startNode)) {
      const [parent] = Editor.parent(editor, startPath);
      const index = parent.children.findIndex(isBadgeElement);
      if (index !== -1) {
        newStart = Editor.start(editor, startPath.slice(0, -1).concat(index));
      }
    }

    // Check end point
    const [endNode, endPath] = Editor.node(editor, end);
    if (SlateElement.isElement(endNode) && isBadgeElement(endNode)) {
      const [parent] = Editor.parent(editor, endPath);
      const index = parent.children.findIndex(isBadgeElement);
      if (index !== -1) {
        newEnd = Editor.end(editor, endPath.slice(0, -1).concat(index));
      }
    }

    // Return selection in the correct order based on direction
    if (isForward) {
      return {
        anchor: newStart,
        focus: newEnd
      };
    } else {
      return {
        anchor: newEnd,
        focus: newStart
      };
    }
  }, [editor]);

  // Use refs instead of state for key tracking to avoid re-renders
  const keyRef = useRef<{ key?: string; shiftKey: boolean; altKey: boolean | undefined }>({ shiftKey: false, altKey: undefined });

  // Handle cut event
  const handleCut = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const selection = expandSelectionToIncludeBadges();
    if (!selection || Range.isCollapsed(selection)) return;

    // Find all badges that intersect with the selection
    const badgeNodes = Array.from(
      Editor.nodes(editor, {
        at: selection,
        match: n => SlateElement.isElement(n) && n.type === 'badge'
      })
    );

    // Create a new selection that includes all intersecting badges
    let expandedSelection = selection;
    for (const [, path] of badgeNodes) {
      const badgeRange = Editor.range(editor, path);
      // Handle both forward and backward selections
      const isForward = Point.isBefore(selection.anchor, selection.focus);
      if (isForward) {
        expandedSelection = {
          anchor: Point.isBefore(expandedSelection.anchor, badgeRange.anchor) 
            ? expandedSelection.anchor 
            : badgeRange.anchor,
          focus: Point.isAfter(expandedSelection.focus, badgeRange.focus)
            ? expandedSelection.focus
            : badgeRange.focus
        };
      } else {
        expandedSelection = {
          anchor: Point.isAfter(expandedSelection.anchor, badgeRange.focus)
            ? expandedSelection.anchor
            : badgeRange.focus,
          focus: Point.isBefore(expandedSelection.focus, badgeRange.anchor)
            ? expandedSelection.focus
            : badgeRange.anchor
        };
      }
    }

    // Get the fragment (selected nodes)
    const fragment = Editor.fragment(editor, expandedSelection);
    const plainText = Editor.string(editor, expandedSelection);
    
    // Encrypt the data
    const encryptedFragment = encrypt(JSON.stringify(fragment));
    const encryptedText = encrypt(plainText);
    
    // Set encrypted data on clipboard
    event.clipboardData.setData('application/x-slate-fragment', encryptedFragment);
    event.clipboardData.setData('text/plain', encryptedText);
    
    // Delete the selected content
    Transforms.delete(editor, { at: expandedSelection });
  }, [editor, expandSelectionToIncludeBadges]);

  // Handle copy event
  const handleCopy = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const selection = expandSelectionToIncludeBadges();
    if (!selection || Range.isCollapsed(selection)) return;

    // Find all badges that intersect with the selection
    const badgeNodes = Array.from(
      Editor.nodes(editor, {
        at: selection,
        match: n => SlateElement.isElement(n) && n.type === 'badge'
      })
    );

    // Create a new selection that includes all intersecting badges
    let expandedSelection = selection;
    for (const [, path] of badgeNodes) {
      const badgeRange = Editor.range(editor, path);
      // Handle both forward and backward selections
      const isForward = Point.isBefore(selection.anchor, selection.focus);
      if (isForward) {
        expandedSelection = {
          anchor: Point.isBefore(expandedSelection.anchor, badgeRange.anchor) 
            ? expandedSelection.anchor 
            : badgeRange.anchor,
          focus: Point.isAfter(expandedSelection.focus, badgeRange.focus)
            ? expandedSelection.focus
            : badgeRange.focus
        };
      } else {
        expandedSelection = {
          anchor: Point.isAfter(expandedSelection.anchor, badgeRange.focus)
            ? expandedSelection.anchor
            : badgeRange.focus,
          focus: Point.isBefore(expandedSelection.focus, badgeRange.anchor)
            ? expandedSelection.focus
            : badgeRange.anchor
        };
      }
    }

    const fragment = Editor.fragment(editor, expandedSelection);
    const plainText = Editor.string(editor, expandedSelection);
    
    // Encrypt the data
    const encryptedFragment = encrypt(JSON.stringify(fragment));
    const encryptedText = encrypt(plainText);
    
    // Set encrypted data on clipboard
    event.clipboardData.setData('application/x-slate-fragment', encryptedFragment);
    event.clipboardData.setData('text/plain', encryptedText);
  }, [editor, expandSelectionToIncludeBadges]);

  // Handle paste event
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const selection = expandSelectionToIncludeBadges();
    if (!selection) return;

    // Try to get our custom fragment
    const fragmentData = event.clipboardData.getData('application/x-slate-fragment');
    if (fragmentData) {
      try {
        // Decrypt the fragment
        const decryptedFragment = decrypt(fragmentData);
        const fragment = JSON.parse(decryptedFragment);
        // Insert fragment at selection
        Transforms.insertFragment(editor, fragment);
        return;
      } catch (error) {
        console.error('Failed to decrypt/parse fragment:', error);
        // Fallback to plain text if decryption/parsing fails
      }
    }
    
    // Fallback: decrypt and insert plain text
    const encryptedText = event.clipboardData.getData('text/plain');
    const decryptedText = decrypt(encryptedText);
    Transforms.insertText(editor, decryptedText);
  }, [editor, expandSelectionToIncludeBadges]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    keyRef.current = { key: event.key, shiftKey: event.shiftKey, altKey: event.altKey };
  }, []);

  const handleKeyUp = useCallback(() => {
    keyRef.current = { key: undefined, shiftKey: false, altKey: undefined };
  }, []);

  // Handle change event
  const handleChange = useCallback((newValue: Descendant[]) => {
    setValue(newValue);
    
    // Check if we're inside a badge and move cursor outside
    const { selection } = editor;
    if (!selection) return;

    const direction = keyRef.current.key === 'ArrowLeft' ? 'left' : keyRef.current.key === 'ArrowRight' ? 'right' : 'right';
    
    // Get the point we're moving from (either anchor or focus depending on shift)
    const point = keyRef.current.shiftKey ? selection.focus : selection.anchor;
    const [, path] = Editor.node(editor, point);
    const [parentNode, parentPath] = Editor.parent(editor, path);
    
    if (SlateElement.isElement(parentNode) && isBadgeElement(parentNode)) {
      // Move cursor to after the badge
      console.log('moving cursor outside badge');
      
      let newPoint;
      if (direction === 'left') {
        // Move to before the current badge
        const point = Editor.start(editor, parentPath);
        newPoint = Editor.before(editor, point);
      } else {
        // Move to after the current badge
        const point = Editor.end(editor, parentPath);
        newPoint = Editor.after(editor, point);
      }

      if (newPoint) {
        if (keyRef.current.shiftKey) {
          // For shift-selection, update the focus point while keeping the anchor
          Transforms.select(editor, {
            anchor: selection.anchor,
            focus: newPoint
          });
        } else {
          // For normal cursor movement, just move the cursor
          Transforms.select(editor, newPoint);
        }
      }
    }
  }, [editor]);

  return {
    value,
    handleCut,
    handleCopy,
    handlePaste,
    handleChange,
    handleKeyDown,
    handleKeyUp
  };
}; 