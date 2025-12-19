import { writable } from "svelte/store";

export const sidebarNotes = writable<any[]>([]);
export const sidebarNotesLoaded = writable(false);


export function setSidebarNotes(notes: any[]) {
  sidebarNotes.set(notes || []);
  sidebarNotesLoaded.set(true);
}

export function upsertSidebarNote(note: any) {
  if (!note) return;

  sidebarNotes.update((arr) => {
    const id = note?._id || note?.id;
    if (!id) return arr;

    const idx = arr.findIndex((n) => (n._id || n.id) === id);

    const next =
      idx >= 0
        ? (() => {
            const copy = [...arr];
            copy[idx] = { ...copy[idx], ...note };
            return copy;
          })()
        : [note, ...arr];

    next.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    );

    return next;
  });
}
