// src/modules/team/team.trpc.ts
import { z } from "zod";
import { TeamService } from "./team.service";
import { NoteService } from "../note/note.service";

export function teamRouter(t, teamService: TeamService,noteService: NoteService) {
  return t.router({
    create: t.procedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          ownerId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return teamService.create(input);
      }),

    findByOwner: t.procedure
      .input(z.object({ ownerId: z.string() }))
      .query(async ({ input }) => {
        return teamService.findByOwner(input.ownerId);
      }),


     getById: t.procedure
  .input(z.object({ teamId: z.string() }))
  .query(async ({ input }) => {
    return teamService.findById(input.teamId);
  }),


   listByTeam: t.procedure
      .input(z.object({ teamId: z.string() }))
      .query(async ({ input }) => {
        return noteService.findByTeam(input.teamId);
      }),

      // team.trpc.ts
addMember: t.procedure
  .input(z.object({
    teamId: z.string(),
    userId: z.string(),
    role: z.enum(["viewer", "editor", "owner"]).default("viewer"),
  }))
  .mutation(({ input }) => teamService.addMember(input.teamId, input.userId, input.role)),

findByMember: t.procedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    // Gọi service để lấy tất cả team user tham gia
    return teamService.findByMember(input.userId);
  }),
inviteByEmail: t.procedure
  .input(
    z.object({
      teamId: z.string(),
      email: z.string().email(),
      role: z.enum(["viewer", "editor"]).default("viewer"),
    })
  )
  .mutation(async ({ input }) => {
    return teamService.inviteByEmail(input.teamId, input.email, input.role);
  }),

  });


}
