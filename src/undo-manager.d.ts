declare module 'undo-manager' {
  export default class UndoManager {
    add(action: { undo: () => void; redo: () => void; html?: string; caret?: number }): void;
    undo(): void;
    redo(): void;
    hasUndo(): boolean;
    hasRedo(): boolean;
    undoStack: Array<{ undo: () => void; redo: () => void; html?: string; caret?: number }>;
    redoStack: Array<{ undo: () => void; redo: () => void; html?: string; caret?: number }>;
    index: number;
  }
} 