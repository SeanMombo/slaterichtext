import { createEditor } from 'slate';
import { withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import type { CustomEditor, CustomElement } from './SlateEditor.d';

// Custom editor with inline support
export const withInlines = (editor: CustomEditor) => {
  const { isInline, isElementReadOnly } = editor;

  editor.isInline = (element: CustomElement) => {
    return element.type === 'badge' || isInline(element);
  };

  editor.isElementReadOnly = (element: CustomElement) => {
    return element.type === 'badge' || isElementReadOnly(element);
  };

  return editor;
};

export const createCustomEditor = () => {
  return withInlines(withHistory(withReact(createEditor()))) as CustomEditor;
}; 