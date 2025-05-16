import React, { useMemo, useEffect, useState } from 'react';
import { Slate, Editable } from 'slate-react';
import { createCustomEditor } from './editorConfig';
import { Element as EditorElement, Text as EditorText } from './components/EditorComponents';
import { useEditorOperations } from './hooks/useEditorOperations';
import { initialValue } from './initialData';

const FPSCounter: React.FC = () => {
  const [fps, setFps] = useState(0);
  const [frames, setFrames] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const updateFPS = (currentTime: number) => {
      setFrames(prev => prev + 1);
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frames * 1000) / (currentTime - lastTime)));
        setFrames(0);
        setLastTime(currentTime);
      }
      
      animationFrameId = requestAnimationFrame(updateFPS);
    };

    animationFrameId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animationFrameId);
  }, [frames, lastTime]);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      {fps} FPS
    </div>
  );
};

const SlateEditor: React.FC = () => {
  // Create a Slate editor object that won't change across renders
  const editor = useMemo(() => createCustomEditor(), []);

  // Use the custom hook for value and handlers
  const { value, handleCut, handleCopy, handlePaste, handleChange, handleKeyDown, handleKeyUp } = useEditorOperations(editor, initialValue);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <FPSCounter />
      <Slate
        editor={editor}
        initialValue={value}
        onChange={handleChange}
      >
        <Editable
          style={{
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            minHeight: '200px',
          }}
          renderElement={props => <EditorElement {...props} />}
          renderLeaf={props => <EditorText {...props} />}
          onCut={handleCut}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        />
      </Slate>
    </div>
  );
};

export default SlateEditor; 