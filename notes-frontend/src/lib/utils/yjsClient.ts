
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import * as awarenessProtocol from 'y-protocols/awareness';


const globalDocs: Record<string, { ydoc: Y.Doc; provider: WebrtcProvider }> =
  (globalThis as any).__yDocs || ((globalThis as any).__yDocs = {});

export function createYDoc(noteId: string) {
    console.warn(` [Yjs] Reusing existing doc for room ${noteId}`);

 
  if (globalDocs[noteId]) {
    console.warn(` [Yjs] Reusing existing doc for room ${noteId}`);
    return globalDocs[noteId];
  }

  
  const ydoc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(ydoc);

 
  const signaling = [
    // 'wss://signaling.y-webrtc.org', 
    // 'wss://yjs-signaling.herokuapp.com', 
    'ws://localhost:4444', 
  ];

 
  const provider = new WebrtcProvider(noteId, ydoc, {
    signaling,
    awareness,
  });

  provider.on('status', (event: any) => {
    console.log(' [Yjs WebRTC] Connection status:', event.status);
  });

 
  globalDocs[noteId] = { ydoc, provider };

  
  const cleanup = () => {
    console.log(` [Yjs] Cleaning up doc for room ${noteId}`);
    provider.destroy();
    ydoc.destroy();
    delete globalDocs[noteId];
  };

  return { ydoc, provider, cleanup };
}
