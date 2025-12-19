import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { NoteService } from './note.service';

export const noteRouter = (noteService: NoteService) => {
  const t = initTRPC.create();

  return t.router({
   list: t.procedure.query(async ({ ctx }) => {
  const viewerId = ctx.user?.id || null;
  return noteService.getPersonalNotes(viewerId);
}),


    // Create
   create: t.procedure
  .input(
    z.object({
      title: z.string(),
      ownerId: z.string(),
      content: z.string().optional(),
      teamId: z.string().optional().nullable(), // ✅ cho phép không gửi
    })
  )
  .mutation(({ input }) => noteService.createNote(input)),

    //  List notes
    listByTeam: t.procedure
  .input(z.object({
    teamId: z.string(),
    viewerId: z.string().optional(),
    viewerEmail: z.string().optional(), 
  }))
  .query(({ input }) => 
    noteService.getNotesByTeam(input.teamId, input.viewerId, input.viewerEmail)
  ),



    //  Get single note
getById: t.procedure
  .input(z.object({ noteId: z.string(), viewerId: z.string().optional() }))
  .query(async ({ input }) => {
    return noteService.getById(input.noteId, input.viewerId || null);
  }),
listForSidebar: t.procedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    return noteService.findForSidebar(input.userId);
  }),



    // Save Yjs snapshot
    saveSnapshot: t.procedure
      .input(z.object({
        noteId: z.string(),
        editorId: z.string().optional(),
        yDocBinary: z.instanceof(Uint8Array),
      }))
      .mutation(({ input }) => noteService.saveSnapshot(input.noteId, input.yDocBinary, input.editorId)),

    //  Restore version
    restoreVersion: t.procedure
  .input(z.object({
    noteId: z.string(),
    historyId: z.string(),
    restorerId: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    return noteService.restoreVersion(input.noteId, input.historyId, input.restorerId);
  }),

      listHistory: t.procedure
  .input(z.object({ noteId: z.string() }))
  .query(({ input }) => noteService.getHistoryByNote(input.noteId)),
recentByUser: t.procedure
  .input(z.object({ userId: z.string() }))
  .query(({ input }) => noteService.getRecentNotesByUser(input.userId)),
getHistoryByNoteId: t.procedure
  .input(z.object({ noteId: z.string() }))
  .query(({ input }) => noteService.getHistoryByNoteId(input.noteId)),

    //  Add comment / mention
   addComment: t.procedure
  .input(z.object({
    noteId: z.string(),
    authorId: z.string(),
    mentionedUserId: z.string().optional(),
    text: z.string(),
    type: z.enum(['comment', 'mention']),
    range: z.any().optional(),
  }))
  .mutation(({ input }) =>
    noteService.addComment(
      input.noteId,
      input.authorId,
      input.text,
      input.type,
      input.range,
      input.mentionedUserId
    )
  ),
  update: t.procedure
      .input(
        z.object({
          noteId: z.string(),
          title: z.string().optional(),
          content: z.string().optional(),
          authorId: z.string().optional(), 
        }),
      )
      .mutation(async ({ input }) => {
        const { noteId, ...data } = input;
        console.log(' [note.update] Cập nhật note:', input);
        return await noteService.update(noteId, data);
      }),

    //  Get comments
    comments: t.procedure
      .input(z.object({ noteId: z.string() }))
      .query(({ input }) => noteService.getComments(input.noteId)),
      // note.trpc.ts
// saveSnapshot: t.procedure
//   .input(z.object({ noteId: z.string(), yDoc: z.instanceof(Uint8Array) }))
//   .mutation(async ({ input }) => {
//     await noteModel.findByIdAndUpdate(input.noteId, {
//       yDoc: Buffer.from(input.yDoc)
//     });
//     return { success: true };
//   }),

togglePublic: t.procedure
  .input(z.object({ noteId: z.string(), isPublic: z.boolean() }))
  .mutation(async ({ input }) => {
    return noteService.togglePublic(input.noteId, input.isPublic);
  }),

addCollaborator: t.procedure
  .input(
    z.object({
      noteId: z.string(),
      userId: z.string(),
      role: z.enum(['editor', 'viewer']),
    })
  )
  .mutation(async ({ input }) => {
    return noteService.addCollaborator(input.noteId, input.userId, input.role);
  }),


  });
};
