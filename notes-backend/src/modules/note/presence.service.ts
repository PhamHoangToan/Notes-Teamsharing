import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Presence } from './presence.schema';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(@InjectModel(Presence.name) private presenceModel: Model<Presence>) {}

  async join(noteId: string, userId: string, connectionId: string, color: string) {
    if (!userId || userId === 'undefined') {
      this.logger.warn(` [join] userId bị undefined khi join note ${noteId}`);
      return null;
    }

    // ép kiểu để Mongoose không cast sai
    const userObjectId = new Types.ObjectId(userId);

    const existing = await this.presenceModel.findOne({ noteId, userId: userObjectId });
    if (existing) {
      existing.status = 'online';
      existing.connectionId = connectionId;
      existing.cursor = { position: 0, color };
      existing.lastSeen = new Date();
      await existing.save();
      this.logger.log(` ${userId} rejoined note ${noteId}`);
      return existing;
    }

    const presence = await this.presenceModel.create({
      noteId,
      userId: userObjectId,
      connectionId,
      status: 'online',
      cursor: { position: 0, color },
      lastSeen: new Date(),
    });

    this.logger.log(`🆕 ${userId} joined note ${noteId}`);
    return presence;
  }

  async updateCursor(connectionId: string, cursor: { position: number; color?: string }) {
    await this.presenceModel.updateOne({ connectionId }, { cursor, lastSeen: new Date() });
  }

  async leave(connectionId: string) {
    await this.presenceModel.updateOne({ connectionId }, { status: 'offline', lastSeen: new Date() });
    this.logger.log(`👋 Connection ${connectionId} left`);
  }

  async getActiveUsers(noteId: string) {
    return this.presenceModel
      .find({ noteId, status: 'online', userId: { $exists: true, $ne: null } })
      .populate('userId', 'username avatarUrl email')
      .lean();
  }
}
