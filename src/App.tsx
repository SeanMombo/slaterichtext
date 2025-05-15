import React, { useRef, useState, useCallback, useEffect } from 'react';
import QuillEditor from './quill';
const narrativeWithCitations = "REVISED NARRATIVE:\n\nOn 01/20/2025, at 0343 hours, while off duty, I observed a verbal altercation in progress between two males in a parking lot in San Francisco. I identified myself as Officer Daniel Francis with SFPD and intervened.{38.27}\n\nUpon arrival, I contacted two subjects involved in what appeared to be a vehicle accident.{41.91} Alonzo Harris claimed his vehicle had been struck. Chad Gates was identified as the second subject.{11.72} A witness, Mrs. Smith, was also present at the scene.{159.45}\n\nI separated the parties to prevent further escalation and began gathering statements.{52.44} Gates claimed he had just entered his vehicle and had not yet put it in reverse when contact was made.{137.85} He stated he has a rear-view camera and would have seen Harris's vehicle if he had been backing up.{150.46} Harris insisted that Gates had backed into his vehicle.{42.63}\n\nI observed damage to Harris's vehicle, specifically noting the rear portion was displaced.{148.36} When asked for documentation, Gates admitted he did not have his registration or insurance information with him, stating it was in another vehicle.{118.26} I advised him that driving without insurance is a violation of California law.{122.18}\n\nNeither party reported any injuries from the incident.{206.28} Both parties remained confrontational with each other, requiring multiple verbal interventions to maintain separation. I ran records checks on both parties through dispatch.\n\nDue to the minor nature of the collision and lack of injuries, I documented the incident for insurance purposes. No arrests were made.\n\nThis report was created with the help of Abel Writer AI writing assistant.";

// Helper to get caret offset
function getCaretCharacterOffsetWithin(element: HTMLElement): number {
  const selection = window.getSelection();
  let caretOffset = 0;
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
}

// Helper to set caret at a specific character offset
function setCaretPosition(element: HTMLElement, offset: number) {
  const selection = window.getSelection();
  const range = document.createRange();
  let charsLeft = offset;

  function traverse(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        if (charsLeft <= node.textContent.length) {
          range.setStart(node, charsLeft);
          range.collapse(true);
          return true;
        } else {
          charsLeft -= node.textContent.length;
        }
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverse(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  traverse(element);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

const App: React.FC = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<{ html: string, caret: number }[]>([{ html: narrativeWithCitations, caret: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const caretBeforeInput = useRef<number>(0);
  const lastInputWasRemoval = useRef(false);
  const [prevCaret, setPrevCaret] = useState<number | null>(null);

  // On initial mount, set caret to start of content in initial history
  useEffect(() => {
    if (divRef.current) {
      const html = divRef.current.innerHTML;
      setHistory([{ html, caret: 0 }]);
      setHistoryIndex(0);
      setCaretPosition(divRef.current, 0);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBeforeInput = useCallback((e: React.FormEvent<HTMLDivElement> & { nativeEvent?: InputEvent }) => {
    if (divRef.current) {
      caretBeforeInput.current = getCaretCharacterOffsetWithin(divRef.current);
      if (e.nativeEvent && 'inputType' in e.nativeEvent) {
        const type = (e.nativeEvent as InputEvent).inputType;
        lastInputWasRemoval.current = type.startsWith('delete') || type === 'deleteByCut';
      } else {
        lastInputWasRemoval.current = false;
      }
    }
  }, []);

  // Save to history on input
  const handleInput = useCallback(() => {
    if (divRef.current) {
      setTimeout(() => {
        const html = divRef.current!.innerHTML;
        const caret = lastInputWasRemoval.current
          ? caretBeforeInput.current
          : getCaretCharacterOffsetWithin(divRef.current!);
        if (html === history[historyIndex].html) return;
        const newHistory = history.slice(0, historyIndex + 1).concat({ html, caret });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }, 0);
    }
  }, [history, historyIndex]);

  // Undo/redo handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
    const isRedo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey));
    if (isUndo && historyIndex > 0) {
      e.preventDefault();
      setHistoryIndex(idx => {
        const newIdx = idx - 1;
        if (divRef.current) {
          divRef.current.innerHTML = history[newIdx].html;
          setCaretPosition(divRef.current, history[newIdx].caret);
        }
        return newIdx;
      });
    } else if (isRedo && historyIndex < history.length - 1) {
      e.preventDefault();
      setHistoryIndex(idx => {
        const newIdx = idx + 1;
        if (divRef.current) {
          divRef.current.innerHTML = history[newIdx].html;
          setCaretPosition(divRef.current, history[newIdx].caret);
        }
        return newIdx;
      });
    }
  }, [history, historyIndex]);

  // Keep contenteditable in sync with historyIndex
  useEffect(() => {
    // Update prevCaret to the caret of the previous history entry (if any)
    if (historyIndex > 0) {
      setPrevCaret(history[historyIndex - 1].caret);
    } else {
      setPrevCaret(null);
    }
    if (divRef.current && divRef.current.innerHTML !== history[historyIndex].html) {
      divRef.current.innerHTML = history[historyIndex].html;
      setCaretPosition(divRef.current, history[historyIndex].caret);
    }
    console.log(history);
    console.log('prevCaret:', prevCaret);
  }, [history, historyIndex, prevCaret]);

  const handleCut = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      e.clipboardData.setData('text/plain', ':)');
      selection.deleteFromDocument();
      handleInput(); // Save to history after cut
    }
  };

  const handleSelect = useCallback(() => {
    // if (divRef.current && historyIndex === 0) {
    //   setTimeout(() => {
    //     const caret = getCaretCharacterOffsetWithin(divRef.current!);
    //     setHistory(h => {
    //       const current = h[0];
    //       return [{ html: current.html, caret }, ...h.slice(1)];
    //     });
    //   }, 0);
    // }
  }, [historyIndex]);

  return (
    <div className="App">
      <h2>ContentEditable Demo</h2>
      <div
        ref={divRef}
        contentEditable
        className="content-editable-section"
        suppressContentEditableWarning={true}
        onCut={handleCut}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onBeforeInput={handleBeforeInput}
      >
        {narrativeWithCitations}
      </div>
      <hr style={{ margin: '40px 0' }} />
      <h2>Quill Rich Text Editor</h2>
      <QuillEditor />
    </div>
  );
};

export default App;
