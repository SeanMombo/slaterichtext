import React, { useRef, useEffect, useCallback, useState } from 'react';
import UndoManager from 'undo-manager';
const narrativeWithCitations = "REVISED NARRATIVE:\n\nOn 01/20/2025, at 0343 hours, while off duty, I observed a verbal altercation in progress between two males in a parking lot in San Francisco. I identified myself as Officer Daniel Francis with SFPD and intervened.{38.27}\n\nUpon arrival, I contacted two subjects involved in what appeared to be a vehicle accident.{41.91} Alonzo Harris claimed his vehicle had been struck. Chad Gates was identified as the second subject.{11.72} A witness, Mrs. Smith, was also present at the scene.{159.45}\n\nI separated the parties to prevent further escalation and began gathering statements.{52.44} Gates claimed he had just entered his vehicle and had not yet put it in reverse when contact was made.{137.85} He stated he has a rear-view camera and would have seen Harris's vehicle if he had been backing up.{150.46} Harris insisted that Gates had backed into his vehicle.{42.63}\n\nI observed damage to Harris's vehicle, specifically noting the rear portion was displaced.{148.36} When asked for documentation, Gates admitted he did not have his registration or insurance information with him, stating it was in another vehicle.{118.26} I advised him that driving without insurance is a violation of California law.{122.18}\n\nNeither party reported any injuries from the incident.{206.28} Both parties remained confrontational with each other, requiring multiple verbal interventions to maintain separation. I ran records checks on both parties through dispatch.\n\nDue to the minor nature of the collision and lack of injuries, I documented the incident for insurance purposes. No arrests were made.\n\nThis report was created with the help of Abel Writer AI writing assistant.";

// Utility to get and set caret position
function saveCaret(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };
  const range = selection.getRangeAt(0);
  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(container);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);
  const start = preSelectionRange.toString().length;
  const end = start + range.toString().length;
  return { start, end };
}

function restoreCaret(container: HTMLElement, pos: { start: number; end: number }) {
  const range = document.createRange();
  const selection = window.getSelection();
  
  let charIndex = 0;
  let foundStart = false;
  let foundEnd = false;
  const nodeStack: Node[] = [container];
  let node: Node | undefined;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  while ((node = nodeStack.pop()) && (!foundStart || !foundEnd)) {
    if (node.nodeType === 3) {
      const textNode = node as Text;
      const nextCharIndex = charIndex + textNode.textContent!.length;
      
      if (!foundStart && pos.start >= charIndex && pos.start <= nextCharIndex) {
        startNode = textNode;
        startOffset = pos.start - charIndex;
        foundStart = true;
      }
      
      if (!foundEnd && pos.end >= charIndex && pos.end <= nextCharIndex) {
        endNode = textNode;
        endOffset = pos.end - charIndex;
        foundEnd = true;
      }
      
      charIndex = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }

  if (startNode && endNode) {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

const processClipboardText = (text: string) => {
  return text.trim().replace(/  +/g, ' ');
};

const RichTextEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    currentIndex: number;
    caretPosition: number;
    isAtInitialState: boolean;
    liveCaretPosition: number;
  }>({
    currentIndex: 0,
    caretPosition: 0,
    isAtInitialState: true,
    liveCaretPosition: 0,
  });

  useEffect(() => {
    undoManagerRef.current = new UndoManager();
  }, []);

  const recordChange = useCallback(() => {
    if (!editorRef.current || !undoManagerRef.current) return;
    
    const html = editorRef.current.innerHTML;
    const selection = saveCaret(editorRef.current);
    
    console.log('Recording change:', { html, selection });

    undoManagerRef.current.add({
      undo: () => {
        if (!editorRef.current) return;
        const prevHtml = editorRef.current.innerHTML;
        const prevSelection = saveCaret(editorRef.current);
        
        console.log('Undoing to:', { prevHtml, prevSelection });
        
        editorRef.current.innerHTML = html;
        restoreCaret(editorRef.current, selection);
      },
      redo: () => {
        if (!editorRef.current) return;
        const nextHtml = editorRef.current.innerHTML;
        const nextSelection = saveCaret(editorRef.current);
        
        console.log('Redoing to:', { nextHtml, nextSelection });
        
        editorRef.current.innerHTML = html;
        restoreCaret(editorRef.current, selection);
      },
    });
  }, []);

  const handleInput = useCallback(() => {
    recordChange();
  }, [recordChange]);

  const handleCut = useCallback(() => {
    recordChange();
  }, [recordChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    let text = e.clipboardData.getData('text/plain');
    text = processClipboardText(text);
    document.execCommand('insertText', false, text);
    recordChange();
  }, [recordChange]);

  const handleCopy = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    let text = window.getSelection()?.toString() || '';
    text = processClipboardText(text);
    e.clipboardData.setData('text/plain', text);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.redo();
    }
  }, []);

  const handleRestoreSpecificCaret = useCallback(() => {
    if (!editorRef.current) return;
    restoreCaret(editorRef.current, { start: 1668, end: 1677 });
  }, []);

  // Custom context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    console.log('Context menu opened');
    e.preventDefault();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
      console.log('Selection saved:', savedSelectionRef.current.toString());
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const restoreSelection = useCallback(() => {
    console.log('Restoring selection');
    if (savedSelectionRef.current && editorRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
      console.log('Selection restored:', savedSelectionRef.current.toString());
    }
  }, []);

  const handleCustomCut = useCallback((e: React.MouseEvent) => {
    console.log('Cut clicked');
    e.preventDefault();
    e.stopPropagation();
    if (!editorRef.current) return;
    restoreSelection();
    document.execCommand('cut');
    recordChange();
    setContextMenu(null);
  }, [recordChange, restoreSelection]);

  const handleCustomCopy = useCallback((e: React.MouseEvent) => {
    console.log('Copy clicked');
    e.preventDefault();
    e.stopPropagation();
    if (!editorRef.current) return;
    restoreSelection();
    document.execCommand('copy');
    setContextMenu(null);
  }, [restoreSelection]);

  const handleCustomPaste = useCallback((e: React.MouseEvent) => {
    console.log('Paste clicked');
    e.preventDefault();
    e.stopPropagation();
    if (!editorRef.current) return;
    restoreSelection();
    editorRef.current.focus();
    
    // Use the same paste handling logic as handlePaste
    navigator.clipboard.readText().then(text => {
      text = processClipboardText(text);
      document.execCommand('insertText', false, text);
      recordChange();
    });
    
    setContextMenu(null);
  }, [recordChange, restoreSelection]);

  // Hide context menu on click elsewhere
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      // Check if click is inside the menu
      const menu = document.querySelector('ul[style*="position: fixed"]');
      if (menu && menu.contains(e.target as Node)) {
        return;
      }
      console.log('Click outside menu');
      setContextMenu(null);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  return (
    <div style={{ position: 'relative', maxWidth: '100vw' }}>
      <div style={{ 
        marginBottom: '10px', 
        padding: '10px', 
        color: 'black',
        backgroundColor: '#f5f5f5', 
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        <div><strong>Debug Info:</strong></div>
        <div>Current Index: {debugInfo.currentIndex}</div>
        <div>Caret Position: {debugInfo.caretPosition}</div>
        <div style={{ color: '#0066cc' }}>Live Caret Position: {debugInfo.liveCaretPosition}</div>
        <div>At Initial State: {debugInfo.isAtInitialState ? 'Yes' : 'No'}</div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        style={{ minHeight: 100, border: '1px solid #ccc', padding: 8 }}
        onInput={handleInput}
        onCut={handleCut}
        onPaste={handlePaste}
        onCopy={handleCopy}
        spellCheck={true}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
        onContextMenu={handleContextMenu}
      >
        {narrativeWithCitations}
      </div>
      {contextMenu && (
        <ul
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            color: 'black',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: 0,
            margin: 0,
            listStyle: 'none',
            zIndex: 1000,
            minWidth: 100,
          }}
        >
          <li style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={handleCustomCut}>Cut</li>
          <li style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={handleCustomCopy}>Copy</li>
          <li style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={handleCustomPaste}>Paste</li>
        </ul>
      )}
      <div style={{ marginTop: 8 }}>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleRedo}>Redo</button>
        <button onClick={handleRestoreSpecificCaret}>Restore Caret</button>
      </div>
    </div>
  );
};

export default RichTextEditor; 