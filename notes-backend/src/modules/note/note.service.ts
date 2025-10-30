import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note } from './note.schema';
import { NoteHistory } from './noteHistory.schema';
import { Comment } from './comment.schema';
import * as Y from 'yjs';
import { diff_match_patch } from 'diff-match-patch';
import * as cheerio from 'cheerio';
import { NotificationService } from '../notification/notification.service';
import { TeamService } from "../team/team.service";
@Injectable()
export class NoteService {
  private readonly logger = new Logger(NoteService.name);

  constructor(
    @InjectModel(Note.name) private noteModel: Model<Note>,
    @InjectModel(NoteHistory.name) private historyModel: Model<NoteHistory>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    private readonly notifService: NotificationService, 
     private readonly teamService: TeamService
  ) {}

  //  Create new note
 async createNote(data: Partial<Note>) {
  const note = await this.noteModel.create({
    title: data.title || "Untitled",
    content: data.content || "",
    ownerId: data.ownerId,             
    teamId: data.teamId || null,        
    mentions: [],
    collaborators: [],
    isPinned: false,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  this.logger.log(` Created note ${note._id} (teamId=${note.teamId || "personal"})`);
  return note;
}


async getNotesByTeam(teamId: string, viewerId?: string | null, viewerEmail?: string) {
  this.logger.log(` [NoteService.getNotesByTeam] teamId=${teamId}, viewerId=${viewerId}, viewerEmail=${viewerEmail}`);

  const team = await this.teamService.findById(teamId);
  if (!team) throw new Error("Không tìm thấy team");

  if (team.ownerId === viewerId) {
    return this.noteModel.find({ teamId }).sort({ updatedAt: -1 });
  }

  const isMember = await this.teamService.isMember(teamId, viewerId || "");
  if (!isMember) throw new Error("Bạn không thuộc team này");


  const notes = await this.noteModel.find({
    teamId,
    $or: [
      { isPublic: true },
      { ownerId: viewerId },
      { "collaborators.userId": viewerId },
      { "collaborators.userId": viewerEmail }, 
    ],
  }).sort({ updatedAt: -1 }).lean();

  this.logger.log(` [NoteService.getNotesByTeam] Trả về ${notes.length} note(s) cho ${viewerId}`);
  return notes;
}




 async getById(noteId: string, viewerId?: string | null, viewerEmail?: string | null) {
  const note = await this.noteModel.findById(noteId);
  if (!note) throw new Error("Note not found");

  if (note.isPublic) return note;

  if (note.teamId) {
    if (!viewerId && !viewerEmail)
      throw new Error("Access denied: chưa xác định người xem");

    // ✅ Chủ note
    if (note.ownerId === viewerId || note.ownerId === viewerEmail)
      return note;

    // ✅ Nếu là collaborator theo email → cho truy cập, KHÔNG CẦN kiểm tra team
    const collaboratorAccess = note.collaborators?.find(
      (c) => c.userId?.trim().toLowerCase() === viewerEmail?.trim().toLowerCase()
    );
    if (collaboratorAccess) return note;

    // 🔒 Nếu không phải collaborator → kiểm tra thành viên team
    const isMember = await this.teamService.isMember(note.teamId, viewerId || "");
    if (!isMember)
      throw new Error("Access denied: bạn không thuộc team này");

    return note;
  }

  // note cá nhân
  if (note.ownerId === viewerId || note.ownerId === viewerEmail) return note;

  const access = note.collaborators?.find(
    (c) =>
      c.userId?.trim().toLowerCase() === viewerEmail?.trim().toLowerCase()
  );
  if (access) return note;

  throw new Error("Access denied");
}

async addCollaborator(noteId: string, userEmail: string, role: 'editor' | 'viewer') {
  this.logger.log(` [NoteService.addCollaborator] Bắt đầu thêm collaborator...`);
  this.logger.debug(`   ├─ noteId = ${noteId}`);
  this.logger.debug(`   ├─ userEmail = ${userEmail}`);
  this.logger.debug(`   └─ role      = ${role}`);

  const note = await this.noteModel.findById(noteId);
  if (!note) throw new Error('Note not found');

  const exists = note.collaborators?.some((c) => c.userId === userEmail);
  if (exists) {
    this.logger.warn(` [NoteService.addCollaborator] Email ${userEmail} đã có quyền trong note ${noteId}.`);
    return note;
  }

  note.collaborators.push({
    userId: userEmail,
    role,
    lastActive: new Date(),
  });

  await note.save();
  this.logger.log(` [NoteService.addCollaborator] Đã thêm ${userEmail} (${role}) vào note ${noteId}`);
  return note;
}

  //  Save realtime Yjs snapshot
  async saveSnapshot(noteId: string, yDocBinary: Uint8Array, editorId?: string) {
    const note = await this.noteModel.findById(noteId);
    if (!note) throw new Error('Note not found');

    const oldContent = note.content || '';
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, yDocBinary);
   const text = ydoc.getText('content');
const newContent = text ? text.toString() : '';


    const dmp = new diff_match_patch();
    const diff = dmp.diff_main(oldContent, newContent);
    dmp.diff_cleanupSemantic(diff);

    await this.historyModel.create({
      noteId,
      editorId,
      snapshot: newContent,
      diff,
    });

    note.yDoc = Buffer.from(yDocBinary);
    note.content = newContent;
    note.updatedAt = new Date();
    await note.save();

    this.logger.log(` Saved Yjs snapshot for note ${noteId}`);
    return { success: true };
  }

 async getHistoryByNoteId(noteId: string) {
  try {
    const histories = await this.historyModel
      .find({ noteId })
      .sort({ createdAt: -1 })
      .populate('editorId', 'username email') 
      .select('editorId snapshot diff createdAt')
      .lean();

    this.logger.log(` [NoteService] Lấy ${histories.length} lịch sử của noteId=${noteId}`);

    //  In chi tiết kết quả ra log
    if (histories.length > 0) {
      histories.forEach((h, i) => {
        const editorInfo = h.editorId
          ? `${h.editorId.username || 'No username'} (${h.editorId.email || 'No email'})`
          : ' Không có editorId (chưa populate được)';
        this.logger.log(
          `   ├─ [${i + 1}] Người sửa: ${editorInfo} | Thời gian: ${h.createdAt}`,
        );
      });
    } else {
      this.logger.warn(`[NoteService] Không tìm thấy lịch sử nào cho noteId=${noteId}`);
    }

    return histories;
  } catch (error) {
    this.logger.error('[NoteService.getHistoryByNoteId] Lỗi:', error);
    throw error;
  }
}


async getRecentNotesByUser(userId: string) {
  const notes = await this.noteModel
    .find({ ownerId: userId })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('title updatedAt ownerId');

  //  Lấy toàn bộ history (của tất cả người)
  const histories = await this.historyModel
    .find({ noteId: { $in: notes.map(n => n._id.toString()) } })
    .sort({ createdAt: -1 })
    .populate('editorId', 'username email')
    .lean();

  // Gom theo note → theo người chỉnh sửa
  const noteHistoriesMap = new Map<string, any>();

  for (const h of histories) {
    const noteId = h.noteId?.toString();
    if (!noteId) continue;

    const noteData = noteHistoriesMap.get(noteId) || { editors: [] };

    // Tìm hoặc thêm editor
    let editorEntry = noteData.editors.find(
      (e: any) => e.editorId?.toString() === h.editorId?._id?.toString(),
    );
    if (!editorEntry) {
      editorEntry = {
        editorId: h.editorId?._id,
        username: h.editorId?.username || 'Unknown',
        email: h.editorId?.email || '',
        histories: [],
      };
      noteData.editors.push(editorEntry);
    }

    // Thêm bản chỉnh sửa vào danh sách của editor đó
    editorEntry.histories.push({
      createdAt: h.createdAt,
      diff: h.diff,
      snapshot: h.snapshot,
    });

    noteHistoriesMap.set(noteId, noteData);
  }

  // Trả về danh sách note với tất cả người & chỉnh sửa
  return notes.map(note => ({
    ...note.toObject(),
    editors: noteHistoriesMap.get(note._id.toString())?.editors || [],
  }));
}


  //  Restore note version
  async restoreVersion(noteId: string, historyId: string) {
    const history = await this.historyModel.findById(historyId);
    if (!history) throw new Error('History not found');

    await this.noteModel.findByIdAndUpdate(noteId, {
      content: history.snapshot,
      updatedAt: new Date(),
    });

    return { success: true };
  }
async getHistoryByNote(noteId: string) {
  return this.historyModel
    .find({ noteId })
    .sort({ createdAt: -1 })
    .select('editorId createdAt diff');
}

  // Add mention/comment
  async addComment(
    noteId: string,
    authorId: string,
    text: string,
    type: 'comment' | 'mention',
    range?: any,
    mentionedUserId?: string
  ) {
    const comment = await this.commentModel.create({
      noteId,
      authorId,
      text,
      type,
      range,
      createdAt: new Date(),
    });

    if (type === 'mention' && mentionedUserId) {
      await this.noteModel.updateOne(
        { _id: noteId },
        { $addToSet: { mentions: mentionedUserId } }
      );

      this.logger.log(
        ` [addComment] Gửi thông báo mention tới userId=${mentionedUserId}`
      );
      await this.notifService.sendMention({
        noteId,
        mentionedUserId,
        byUserId: authorId,
      });
    }

    return comment;
  }

  //  Get comments of note
  async getComments(noteId: string) {
    return this.commentModel.find({ noteId }).sort({ createdAt: 1 });
  }

  //  Update note + detect mention
async update(noteId: string, data: any) {
  this.logger.log(' [NoteService.update] Dữ liệu nhận:', data);

  const note = await this.noteModel.findById(noteId);
  if (!note) throw new Error('Note not found');

  // Nếu có nội dung mới → ghi vào lịch sử thay đổi
  if (typeof data.content === 'string') {
    const oldContent = note.content || '';
    const newContent = data.content;

    //  Kiểm tra nếu nội dung thực sự thay đổi
    if (oldContent.trim() !== newContent.trim()) {
      const dmp = new diff_match_patch();
      const diff = dmp.diff_main(oldContent, newContent);
      dmp.diff_cleanupSemantic(diff);

      if (data.authorId) {
        await this.historyModel.create({
          noteId,
          editorId: new Types.ObjectId(data.authorId),
          snapshot: newContent,
          diff,
        });
        this.logger.log(
          `[NoteService.update] Đã lưu lịch sử cho noteId=${noteId}, editorId=${data.authorId}`,
        );
      } else {
        this.logger.warn(
          ` [NoteService.update] Bỏ qua lưu lịch sử vì không có authorId (noteId=${noteId})`,
        );
      }
    } else {
      this.logger.verbose(`ℹ[NoteService.update] Nội dung không thay đổi, bỏ qua lịch sử.`);
    }
  }

  // Cập nhật note hiện tại
  const updatedNote = await this.noteModel.findByIdAndUpdate(noteId, {
    ...data,
    updatedAt: new Date(),
  }, { new: true });

  //  Xử lý mentions nếu có "@"
  if (data.content?.includes('@')) {
    this.logger.log(' [NoteService.update] Phát hiện ký tự @ trong nội dung');
    const $ = cheerio.load(data.content);
    const text = $.text();
    const mentions = Array.from(text.matchAll(/@([a-zA-Z0-9_]+)/g)).map(m => m[1]);

    if (mentions.length > 0) {
      this.logger.log(`[NoteService.update] Phát hiện mention: ${mentions.join(', ')}`);
      for (const username of mentions) {
        const mentionedUser = await this.noteModel.db
          .collection('users')
          .findOne({ username });

        if (mentionedUser) {
          await this.noteModel.updateOne(
            { _id: noteId },
            { $addToSet: { mentions: mentionedUser._id.toString() } },
          );

          //  Gửi thông báo realtime
          await this.notifService.sendMention({
            noteId,
            mentionedUserId: mentionedUser._id.toString(),
            byUserId: data.authorId || 'unknown',
          });

          this.logger.log(` [NoteService.update] Gửi thông báo mention cho ${username}`);
        } else {
          this.logger.warn(` [NoteService.update] Không tìm thấy user '${username}'`);
        }
      }
    }
  }

  return updatedNote;
}
async findByTeam(teamId: string) {
  return this.noteModel.find({ teamId }).lean();
}
async togglePublic(noteId: string, isPublic: boolean) {
  const updated = await this.noteModel.findByIdAndUpdate(
    noteId,
    { isPublic, updatedAt: new Date() },
    { new: true }
  );
  this.logger.log(`[NoteService] Note ${noteId} set public=${isPublic}`);
  return updated;
}

async getPersonalNotes(userId?: string | null) {
  if (!userId) return [];

  //  Lấy các note không có teamId (note cá nhân)
  return this.noteModel.find({
    $or: [
      { teamId: { $exists: false } },
      { teamId: null },
    ],
    $or: [
      { ownerId: userId },
      { isPublic: true },
      { "collaborators.userId": userId },
    ],
  }).sort({ updatedAt: -1 });
}
// Lấy tất cả note mà user có quyền xem (cá nhân + cộng tác)
async getNotesByUser(userId: string) {
  this.logger.log(` [NoteService.getNotesByUser] Load notes for user=${userId}`);

  const notes = await this.noteModel.find({
    $or: [
      { ownerId: userId },                        // note do user tạo
      { "collaborators.userId": userId },         // note user được cấp quyền
      { isPublic: true },                         
    ],
  })
  .sort({ updatedAt: -1 })
  .lean();

  this.logger.log(`[NoteService.getNotesByUser] Found ${notes.length} notes`);
  return notes;
}


}
