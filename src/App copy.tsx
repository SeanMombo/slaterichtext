import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

interface HistoryState {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

function App() {
  const [isEditable, setIsEditable] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)
  const [history, setHistory] = useState<HistoryState[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const isUndoRedo = useRef(false)
  const lastContent = useRef('')
  const historyRef = useRef<HistoryState[]>([])
  const canInitHistory = useRef(true)
  const narrativeWithCitations = "REVISED NARRATIVE:\n\nOn 01/20/2025, at 0343 hours, while off duty, I observed a verbal altercation in progress between two males in a parking lot in San Francisco. I identified myself as Officer Daniel Francis with SFPD and intervened.{38.27}\n\nUpon arrival, I contacted two subjects involved in what appeared to be a vehicle accident.{41.91} Alonzo Harris claimed his vehicle had been struck. Chad Gates was identified as the second subject.{11.72} A witness, Mrs. Smith, was also present at the scene.{159.45}\n\nI separated the parties to prevent further escalation and began gathering statements.{52.44} Gates claimed he had just entered his vehicle and had not yet put it in reverse when contact was made.{137.85} He stated he has a rear-view camera and would have seen Harris's vehicle if he had been backing up.{150.46} Harris insisted that Gates had backed into his vehicle.{42.63}\n\nI observed damage to Harris's vehicle, specifically noting the rear portion was displaced.{148.36} When asked for documentation, Gates admitted he did not have his registration or insurance information with him, stating it was in another vehicle.{118.26} I advised him that driving without insurance is a violation of California law.{122.18}\n\nNeither party reported any injuries from the incident.{206.28} Both parties remained confrontational with each other, requiring multiple verbal interventions to maintain separation. I ran records checks on both parties through dispatch.\n\nDue to the minor nature of the collision and lack of injuries, I documented the incident for insurance purposes. No arrests were made.\n\nThis report was created with the help of Abel Writer AI writing assistant."

  const processCitations = (text: string) => {
    return text
      .replace(/\n/g, '<br />')
      .replace(/\{(\d+\.\d+)\}/g, '<span class="citation-wrapper" contenteditable="false"><sup><a href="#" class="citation-link">$1</a></sup></span>')
  }

  // Simple encryption function (you can replace this with your preferred encryption method)
  const encryptText = (text: string): string => {
    return btoa(text) // Base64 encoding for demonstration
  }

  // Simple decryption function
  const decryptText = (text: string): string => {
    try {
      return atob(text) // Base64 decoding for demonstration
    } catch {
      return text // Return original text if decryption fails
    }
  }

  // Initialize content on component mount
  useEffect(() => {
    if (!isInitialized.current) {
      const processedContent = processCitations(narrativeWithCitations)
      if (contentRef.current) {
        contentRef.current.innerHTML = processedContent
        lastContent.current = processedContent

        
        setCurrentIndex(0)
      }
      isInitialized.current = true
    }
  }, [])

  useEffect(() => {
    historyRef.current = history
  }, [history])

  // Handle beforeinput event to capture initial cursor position
  const handleBeforeInput = useCallback(() => {
    if (!contentRef.current || historyRef.current.length > 1 || !canInitHistory.current) return
    canInitHistory.current = false
    console.log('handleBeforeInput', historyRef.current)
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(contentRef.current)
      preCaretRange.setEnd(range.endContainer, range.endOffset)
      const selectionStart = preCaretRange.toString().length
      console.log('selectionStart', selectionStart)
      setHistory([{
        content: contentRef.current.innerHTML,
        selectionStart,
        selectionEnd: selectionStart
      }])
    } 
  }, [canInitHistory])
  

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (!contentRef.current) return

    const currentContent = contentRef.current.innerHTML
    if (currentContent === lastContent.current) return

    const selection = window.getSelection()
    let selectionStart = 0
    let selectionEnd = 0

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(contentRef.current)
      preCaretRange.setEnd(range.endContainer, range.endOffset)
      selectionStart = preCaretRange.toString().length
      selectionEnd = selectionStart
    }

    const newState: HistoryState = {
      content: currentContent,
      selectionStart,
      selectionEnd
    }

    setHistory(prev => {
      // Otherwise, slice and add as before
      const newHistory = prev.slice(0, currentIndex + 1)
      return [...newHistory, newState]
    })
    setCurrentIndex(prev => prev + 1)
    lastContent.current = currentContent
  }, [currentIndex])

  // Restore state from history
  const restoreFromHistory = useCallback((index: number) => {
    if (index < 0 || index >= history.length) return

    isUndoRedo.current = true
    const state = history[index]

    if (contentRef.current) {
      contentRef.current.innerHTML = state.content
      lastContent.current = state.content
      
      // Restore selection
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        const targetOffset = state.selectionStart

        // Get all text nodes in order
        const textNodes: Text[] = []
        const walker = document.createTreeWalker(
          contentRef.current,
          NodeFilter.SHOW_TEXT,
          null
        )
        
        let node: Text | null
        while ((node = walker.nextNode() as Text) !== null) {
          textNodes.push(node)
        }

        // Calculate total text length
        const totalLength = textNodes.reduce((sum, node) => sum + (node.textContent?.length || 0), 0)

        // Only try to restore position if we have a valid offset
        if (targetOffset >= 0 && targetOffset <= totalLength) {
          // Find the right text node and offset
          let currentOffset = 0
          for (const textNode of textNodes) {
            const length = textNode.textContent?.length || 0
            if (currentOffset + length >= targetOffset) {
              const nodeOffset = targetOffset - currentOffset
              range.setStart(textNode, nodeOffset)
              range.setEnd(textNode, nodeOffset)
              selection.removeAllRanges()
              selection.addRange(range)
              break
            }
            currentOffset += length
          }
        }
      }
      fixCursorPosition()
      // If we're at the initial state (index 0), overwrite the history with the current cursor position
      if (index === 0) {
        canInitHistory.current = true
        setHistory([
          {
            content: contentRef.current.innerHTML,
            selectionStart: 4,
            selectionEnd: 4
          }
        ])
        setCurrentIndex(1)
      }
    }
    isUndoRedo.current = false
  }, [history])

  // Handle copy event
  const handleCopy = useCallback((e: ClipboardEvent) => {
    e.preventDefault()
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      const selectedText = selection.toString()
      const encryptedText = encryptText(selectedText)
      e.clipboardData?.setData('text/plain', encryptedText)
    }
  }, [])

  // Handle paste event
  const handlePaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData?.getData('text/plain')
    if (pastedText) {
      try {
        // Try to decrypt the pasted text
        const decryptedText = decryptText(pastedText)
        
        // Insert the decrypted text at the current cursor position
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const textNode = document.createTextNode(decryptedText)
          range.deleteContents()
          range.insertNode(textNode)
          range.setStartAfter(textNode)
          range.setEndAfter(textNode)
          selection.removeAllRanges()
          selection.addRange(range)
          
          // Save state after paste
          saveToHistory()
        }
      } catch {
        // If decryption fails, insert the original text
        document.execCommand('insertText', false, pastedText)
        saveToHistory()
      }
    }
  }, [saveToHistory])

  // Handle keyboard events for undo/redo
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (e.shiftKey) {
        // Redo
        if (currentIndex < history.length - 1) {
          restoreFromHistory(currentIndex + 1)
          setCurrentIndex(prev => prev + 1)
        }
      } else {
        // Undo
        if (currentIndex > 0) {
          restoreFromHistory(currentIndex - 1)
          setCurrentIndex(prev => prev - 1)
        }
      }
    }
  }, [currentIndex, history, restoreFromHistory])

  // Add event listeners
  useEffect(() => {
    const element = contentRef.current
    if (element) {
      element.addEventListener('copy', handleCopy as EventListener)
      element.addEventListener('paste', handlePaste as unknown as EventListener)
      element.addEventListener('keydown', handleKeyDown as EventListener)
      element.addEventListener('beforeinput', handleBeforeInput as EventListener)
    }

    return () => {
      if (element) {
        element.removeEventListener('copy', handleCopy as EventListener)
        element.removeEventListener('paste', handlePaste as unknown as EventListener)
        element.removeEventListener('keydown', handleKeyDown as EventListener)
        element.removeEventListener('beforeinput', handleBeforeInput as EventListener)
      }
    }
  }, [handleCopy, handlePaste, handleKeyDown, handleBeforeInput ])


  // Handle content changes
  const handleContentChange = () => {
    if (contentRef.current && !isUndoRedo.current) {
      // Check and fix cursor position if it's inside a citation
      fixCursorPosition();
      
      // Get current cursor position before saving
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        // Save state with current cursor position
        saveToHistory()
      }
    }
  }

  // Function to ensure cursor is not inside citation tags
  const fixCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection || !contentRef.current) return;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    // Check if cursor is inside a citation wrapper
    let currentElement = container.nodeType === Node.ELEMENT_NODE 
      ? container as HTMLElement
      : container.parentElement as HTMLElement;
    
    while (currentElement && currentElement !== contentRef.current) {
      if (currentElement.classList?.contains('citation-wrapper')) {
        // Move cursor after the citation
        const newRange = document.createRange();
        newRange.setStartAfter(currentElement);
        newRange.setEndAfter(currentElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
        break;
      }
      currentElement = currentElement.parentElement as HTMLElement;
    }
  }

  return (
    <div className="app-container">
      <h1>Rich Text Editor</h1>
      
      <div className="content-editable-section">
        <div className="toggle-container">
          <label className="toggle-label">
            <span>Content Editable:</span>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={isEditable}
                onChange={(e) => setIsEditable(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </div>
          </label>
        </div>
        
        <div
          ref={contentRef}
          className="content-editable-input"
          contentEditable={isEditable}
          suppressContentEditableWarning={true}
          onInput={handleContentChange}
        />
      </div>
    </div>
  )
}

export default App
