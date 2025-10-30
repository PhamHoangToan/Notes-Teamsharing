// src/lib/types/tiptap-extensions.d.ts
declare module '@tiptap/extension-collaboration' {
  import { Extension } from '@tiptap/core';
  import * as Y from 'yjs';

  export interface CollaborationOptions {
    document: Y.Doc;
    field?: string;
  }

  export const Collaboration: Extension<CollaborationOptions>;
  export default Collaboration;
}

declare module '@tiptap/extension-collaboration-cursor' {
  import { Extension } from '@tiptap/core';
  import { WebrtcProvider } from 'y-webrtc';
  import { Awareness } from 'y-protocols/awareness';

  export interface CollaborationCursorOptions {
    provider: WebrtcProvider;
    user?: { name?: string; color?: string };
    awareness?: Awareness;
  }

  export const CollaborationCursor: Extension<CollaborationCursorOptions>;
  export default CollaborationCursor;
}

declare module '@tiptap/core';
declare module '@tiptap/starter-kit';
declare module '@tiptap/extension-mention';