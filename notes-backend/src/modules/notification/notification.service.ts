import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notifModel: Model<Notification>, 
    private readonly gateway: NotificationGateway
  ) {}


  async sendMention({
    noteId,
    mentionedUserId,
    byUserId,
  }: {
    noteId: string;
    mentionedUserId: string;
    byUserId: string;
  }) {
    this.logger.log(
      `[sendMention] Chuẩn bị gửi mention tới ${mentionedUserId} từ ${byUserId} (note=${noteId})`
    );

    const message = `Bạn được nhắc đến trong một ghi chú`;
    const notif = await this.notifModel.create({
      userId: mentionedUserId,
      senderId: byUserId,
      noteId,
      type: 'mention',
      message,
    });

    this.logger.log(
      `[sendMention] Notification document tạo thành công: ${notif._id}`
    );
    this.gateway.pushToUser(mentionedUserId, notif);
    this.logger.log(`[sendMention] Notification realtime đã đẩy qua gateway`);
    return notif;
  }


  async sendComment({
    noteId,
    recipientId,
    byUserId,
  }: {
    noteId: string;
    recipientId: string;
    byUserId: string;
  }) {
    const message = `Có bình luận mới trong ghi chú của bạn`;
    const notif = await this.notifModel.create({
      userId: recipientId,
      senderId: byUserId,
      noteId,
      type: 'comment',
      message,
    });

    this.gateway.pushToUser(recipientId, notif);
    this.logger.log(`Comment notification sent to ${recipientId}`);
    return notif;
  }


  async getByUser(userId: string) {
    this.logger.log(` [NotificationService] getByUser(${userId})`);
    return this.notifModel
      .find({ userId })
      .populate('noteId', 'title') 
      .sort({ createdAt: -1 });
  }

  
  async markAsRead(notificationId: string) {
    this.logger.log(`✅ [NotificationService] markAsRead(${notificationId})`);
    return this.notifModel.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
  }


async sendNoteAccessGranted(payload: {
  noteId: string;
  toUserId: string;
  role: string;
}) {
  this.logger.log(
    `[NotificationService] Gửi thông báo "được cấp quyền ${payload.role}" cho userId=${payload.toUserId} (noteId=${payload.noteId})`
  );


  return { success: true };
}

}
