import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RichTextEditor from './RichTextEditor';
import SlateEditor from './SlateEditor';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <SlateEditor />
    {/* <SlateEditor /> */}
  </StrictMode>,
)
