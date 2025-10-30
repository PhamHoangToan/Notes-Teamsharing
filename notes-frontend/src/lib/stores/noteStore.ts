import { writable, get } from 'svelte/store';
import { trpc } from '$lib/trpc/client';

// Store riêng giữ note hiện tại
export const currentNote = writable({
  id: null as string | null,
  title: '',
  content: '',
  initialized: false,
});

interface NoteState {
  currentNote: any;
  content: string;
  trpc: any;
}

function createNoteStore() {
  const { subscribe, set, update } = writable<NoteState>({
    currentNote: null,
    content: '',
    trpc,
  });

  // Timer để debounce auto-save
  let saveTimer: any = null;

 
  //  Hàm auto-save
async function autoSave() {
  const { currentNote, content } = get(noteStore);
  if (!currentNote?.id) {
    console.warn(' [AutoSave] Bỏ qua vì currentNote.id null');
    return;
  }

  console.log(' [AutoSave] Gửi request update note:', {
    noteId: currentNote.id,
    contentPreview: content.slice(0, 200), 
  });

  try {
    const res = await trpc.note.update.mutate({
      noteId: currentNote.id,
      content,
    });
    console.log(' [AutoSave] Phản hồi từ server:', res);
  } catch (err) {
    console.error(' [AutoSave] Lỗi khi lưu:', err);
  }
}

return {
  subscribe,
  set,
  update,

  updateContent(html: string) {
    console.log('📝 [noteStore.updateContent] Nhận content mới:', html.slice(0, 100) + '...');
    update((s) => ({ ...s, content: html }));

    clearTimeout(saveTimer);
    console.log('🕓 [AutoSave] Schedule lưu sau 2s...');
    saveTimer = setTimeout(autoSave, 2000);
  },

  setCurrentNote(note: any) {
    console.log('📌 [noteStore.setCurrentNote] Thiết lập note hiện tại:', note?.id);
    currentNote.set(note);
    update((s) => ({ ...s, currentNote: note, content: note.content || '' }));
  },

  reset() {
    console.log('🔁 [noteStore.reset] Reset store');
    set({ currentNote: null, content: '', trpc });
    currentNote.set({ id: null, title: '', content: '', initialized: false });
  },
};

}

export const noteStore = createNoteStore();
