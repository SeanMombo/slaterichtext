import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './editor/SlateEditor.css'
import SlateEditor from './editor/SlateEditor';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SlateEditor />
  </StrictMode>,
)
