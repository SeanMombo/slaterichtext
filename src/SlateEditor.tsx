import React, { useCallback, useMemo, useState } from 'react';
import { createEditor, Descendant, Transforms, BaseEditor, Editor, Node, Element as SlateElement, Point } from 'slate';
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps, useSelected } from 'slate-react';
import { withHistory } from 'slate-history';
import { css } from '@emotion/css';
import type { CustomEditor, CustomElement } from './SlateEditor.d';

// Function to parse text and convert citations to proper format
const parseCitations = (text: string): Descendant[] => {
  const parts: Descendant[] = [];
  let lastIndex = 0;
  let currentParagraph: Descendant = {
    type: 'paragraph',
    children: []
  };
  
  // Match both {MM:SS} and {seconds.decimals} formats
  const citationRegex = /\{(\d+:\d+|\d+\.\d+)\}/g;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      // Split by newlines and handle each part
      const lines = textBefore.split('\n');
      
      // Add first line to current paragraph
      if (lines[0]) {
        currentParagraph.children.push({ text: lines[0] });
      }
      
      // Create new paragraphs for remaining lines
      for (let i = 1; i < lines.length; i++) {
        if (currentParagraph.children.length > 0) {
          parts.push(currentParagraph);
        }
        currentParagraph = {
          type: 'paragraph',
          children: lines[i] ? [{ text: lines[i] }] : []
        };
      }
    }

    // Add the citation
    currentParagraph.children.push({
      children: [{ text: `(${match[1]})` }],
      type: 'badge'
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    const lines = remainingText.split('\n');
    
    // Add first line to current paragraph
    if (lines[0]) {
      currentParagraph.children.push({ text: lines[0] });
    }
    
    // Create new paragraphs for remaining lines
    for (let i = 1; i < lines.length; i++) {
      if (currentParagraph.children.length > 0) {
        parts.push(currentParagraph);
      }
      currentParagraph = {
        type: 'paragraph',
        children: lines[i] ? [{ text: lines[i] }] : []
      };
    }
  }

  // Add the last paragraph if it has content
  if (currentParagraph.children.length > 0) {
    parts.push(currentParagraph);
  }

  return parts;
};

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
const InlineChromiumBugfix = () => (
  <sup
    contentEditable={false}
    className={css`
      font-size: 0;
    `}
  >
    {String.fromCodePoint(160) /* Non-breaking space */}
  </sup>
);

// Custom editor with inline support
const withInlines = (editor: CustomEditor) => {
  const { isInline, isElementReadOnly, isSelectable } = editor;

  editor.isInline = (element: CustomElement) => {
    return element.type === 'badge' || isInline(element);
  };

  editor.isElementReadOnly = (element: CustomElement) => {
    return element.type === 'badge' || isElementReadOnly(element);
  };

  editor.isSelectable = (element: CustomElement) => {
    return element.type === 'badge' || isSelectable(element);
  };

  return editor;
};

const BadgeComponent = ({
  attributes,
  children,
}: RenderElementProps) => {

  return (
    <sup
      {...attributes}
    //   contentEditable={false}
      className={css`
        color: #0066cc;
        font-size: 0.8em;
        vertical-align: super;
      `}
    >
      <InlineChromiumBugfix />
      {children}
      <InlineChromiumBugfix />
    </sup>
  );
};

const Element = (props: RenderElementProps) => {
  const { attributes, children, element } = props;
  switch (element.type) {
    case 'badge':
      return <BadgeComponent {...props} />;
    default:
      return <p {...attributes}>{children}</p>;
  }
};

const Text = (props: RenderLeafProps) => {
  const { attributes, children, leaf } = props;
  return (
    <span
      className={
        leaf.text === ''
          ? css`
              padding-left: 0.1px;
            `
          : undefined
      }
      {...attributes}
    >
      {children}
    </span>
  );
};

// Define the initial value for the editor
const initialText = "On May 8, 2025, at approximately 1751 hours, I, Officer Sean Mombo of the Abel Police Department, was on duty wearing department issued AVR when I responded to a vehicle accident at 530 3rd St, San Francisco, CA 94107.\n\nUpon arrival at the scene, I identified myself as SFPD to the involved parties {6.26}. I observed two civilians engaged in a verbal dispute regarding a vehicle collision. One individual was claiming that the other had struck their vehicle while backing up {11.663}. Both parties appeared agitated and were arguing about the circumstances of the collision.\n\nI immediately attempted to separate the parties to de-escalate the situation, repeatedly instructing them to \"Let's separate\" {14.584} and \"Stand back\" {116.746}. After creating distance between the individuals, I confirmed that neither party had sustained physical injuries by asking both if they were okay {97.562}, to which they both indicated they were not injured {102.005}.\n\nI identified the involved parties as Chad Gates {39.92} and Alonzo Harris {146.961}. During my investigation, Mr. Gates admitted that he did not have his vehicle registration or proof of insurance with him, stating that these documents were in another vehicle {45.265}.\n\nThe parties provided conflicting accounts of the incident. One driver claimed they had not yet put their vehicle in reverse and had not moved at all when the collision occurred {65.861}. The other driver contradicted this statement, insisting that the vehicle had already been in motion {68.982}. One of the drivers mentioned having a rear view camera in their vehicle {77.545} but confirmed they did not have any recording of the incident {82.227}.\n\nI collected identification from both Mr. Gates and Mr. Harris to document the parties involved {162.627}. I advised both individuals that while the current situation was being handled as a traffic accident, continued confrontational behavior could potentially escalate the situation and result in additional legal consequences {154.484}.\n\nAfter gathering the necessary information from both parties, I concluded my investigation at the scene. My body-worn camera was active throughout the entire interaction, documenting the exchange between the involved parties and my response to the incident.\n\nThis report was created with the help of Abel Writer AI writing assistant.";

const initialValue: Descendant[] = parseCitations(initialText);

// Custom function to replace whitespace with $
const replaceWhitespace = (text: string): string => {
  return text.replace(/\s/g, '$');
};

// Custom function to restore whitespace from $
const restoreWhitespace = (text: string): string => {
  return text.replace(/\$/g, ' ');
};

const SlateEditor: React.FC = () => {
  // Create a Slate editor object that won't change across renders
  const editor = useMemo(
    () => withInlines(withHistory(withReact(createEditor()))) as CustomEditor,
    []
  );

  // Keep track of state for the value of the editor
  const [value, setValue] = useState<Descendant[]>(initialValue);

  // Helper function to expand selection to include entire badges at edges
  const expandSelectionToIncludeBadges = useCallback(() => {
    const { selection } = editor;
    if (!selection) return selection;

    const [start, end] = Editor.edges(editor, selection);
    const isForward = Point.isBefore(selection.anchor, selection.focus);

    // Get nodes at the selection points
    const startNodes = Array.from(
      Editor.nodes(editor, {
        at: start,
        match: n => SlateElement.isElement(n) && n.type === 'badge'
      })
    );
    const endNodes = Array.from(
      Editor.nodes(editor, {
        at: end,
        match: n => SlateElement.isElement(n) && n.type === 'badge'
      })
    );

    // If we're selecting forward and there's a badge at the end
    if (isForward && endNodes.length > 0) {
      let newEnd = end;
      let currentNode = Editor.node(editor, newEnd)[0];
      // Keep moving forward until we're outside all badge nodes
      while (SlateElement.isElement(currentNode) && currentNode.type === 'badge') {
        const next = Editor.next(editor, { at: newEnd });
        if (!next) break;
        const [node, path] = next;
        if (!Point.isPoint(path)) break;
        newEnd = path;
        currentNode = node;
      }
      
      return {
        anchor: selection.anchor,
        focus: newEnd
      };
    }
    console.log(isForward, endNodes);
    // If we're selecting backward and there's a badge at the end
    if (!isForward && endNodes.length > 0) {
      let newEnd = end;
      let currentNode = Editor.node(editor, newEnd)[0];
      console.log(currentNode);
      
      // Keep moving backward until we're outside all badge nodes
      while (SlateElement.isElement(currentNode) && currentNode.type === 'badge') {
        const prev = Editor.previous(editor, { at: newEnd });
        if (!prev) break;
        const [node, path] = prev;
        if (!Point.isPoint(path)) break;
        newEnd = path;
        currentNode = node;
      }
      
      return {
        anchor: selection.anchor,
        focus: newEnd
      };
    }

    return selection;
  }, [editor]);

  // Handle cut event
  const handleCut = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const selection = expandSelectionToIncludeBadges();
    if (!selection) return;

    const text = Editor.string(editor, selection);
    const modifiedText = replaceWhitespace(text);
    
    // Set the clipboard data
    event.clipboardData.setData('text/plain', modifiedText);
    
    // Delete the selected text
    Transforms.delete(editor, { at: selection });
  }, [editor, expandSelectionToIncludeBadges]);

  // Handle copy event
  const handleCopy = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const selection = expandSelectionToIncludeBadges();
    if (!selection) return;

    const text = Editor.string(editor, selection);
    const modifiedText = replaceWhitespace(text);
    
    // Set the clipboard data
    event.clipboardData.setData('text/plain', modifiedText);
  }, [editor, expandSelectionToIncludeBadges]);

  // Handle paste event
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const selection = expandSelectionToIncludeBadges();
    if (!selection) return;

    const text = event.clipboardData.getData('text/plain');
    const restoredText = restoreWhitespace(text);
    
    // Insert the restored text at the current selection
    Transforms.delete(editor, { at: selection });
    Transforms.insertText(editor, restoredText);
  }, [editor, expandSelectionToIncludeBadges]);

  const handleKeyDown = useCallback(() => {
      const selection = expandSelectionToIncludeBadges();
      if (!selection) return;
  }, [ expandSelectionToIncludeBadges]);
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Slate
        editor={editor}
        initialValue={value}
        onChange={newValue => setValue(newValue)}
      >
        <Editable
          style={{
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            minHeight: '200px',
          }}
          renderElement={props => <Element {...props} />}
          renderLeaf={props => <Text {...props} />}
          onCut={handleCut}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
        />
      </Slate>
    </div>
  );
};

export default SlateEditor; 