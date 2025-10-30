import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from './team.schema';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @InjectModel(Team.name) private teamModel: Model<Team>,
    private readonly notifService: NotificationService, // 👈 inject NotificationService
  ) {}

  // Tạo team mới
  async create(data: Partial<Team>) {
    const team = await this.teamModel.create({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.logger.log(` Created team ${team.name} (${team._id})`);
    return team;
  }

  //  Tìm team theo chủ sở hữu
  async findByOwner(ownerId: string) {
    return this.teamModel.find({ ownerId }).lean();
  }

  //  Thêm thành viên theo userId
  async addMember(teamId: string, userId: string, role = 'viewer') {
    const team = await this.teamModel.findById(teamId);
    if (!team) throw new Error('Không tìm thấy team');

    const exists = team.members?.some((m) => m.userId === userId);
    if (exists) throw new Error('Người dùng này đã có trong team!');

    team.members.push({
      userId,
      role,
      joinedAt: new Date(),
    });

    await team.save();
    this.logger.log(` Added userId=${userId} to teamId=${teamId}`);
    return team;
  }

  //  Lấy danh sách thành viên team
  async getMembers(teamId: string) {
    const team = await this.teamModel.findById(teamId).lean();
    return team?.members || [];
  }

  //  Tìm team theo ID
  async findById(teamId: string) {
    return this.teamModel.findById(teamId).lean();
  }

  // Kiểm tra user có trong team không
  async isMember(teamId: string, userId: string) {
    const team = await this.teamModel.findOne({
      _id: teamId,
      'members.userId': userId,
    });
    return !!team;
  }

  // Lấy quyền (role) của user trong team
  async getRole(teamId: string, userId: string) {
    const team = await this.teamModel.findById(teamId).lean();
    const member = team?.members?.find((m) => m.userId === userId);
    return member?.role || null;
  }

  // Tìm tất cả team mà user tham gia (owner hoặc member)
  async findByMember(userId: string) {
    return this.teamModel
      .find({
        $or: [{ ownerId: userId }, { 'members.userId': userId }],
      })
      .lean();
  }

  //  Mời thành viên bằng email
  async inviteByEmail(teamId: string, email: string, role: string) {
    const user = await this.teamModel.db.collection('users').findOne({ email });
    if (!user) throw new Error('Không tìm thấy người dùng có email này!');

    const team = await this.teamModel.findById(teamId);
    if (!team) throw new Error('Không tìm thấy team');

    const exists = team.members?.some(
      (m) => m.userId === user._id.toString(),
    );
    if (exists) throw new Error('Người dùng này đã có trong team!');

    team.members.push({
      userId: user._id.toString(),
      role,
      joinedAt: new Date(),
    });

    await team.save();
    this.logger.log(
      ` Invited ${email} (userId=${user._id}) vào teamId=${teamId}`,
    );


    try {
      await this.notifService.sendTeamInvite({
        teamId,
        toUserId: user._id.toString(),
        invitedBy: team.ownerId,
      });
      this.logger.log(` Sent invite notification to ${email}`);
    } catch (err) {
      this.logger.warn(
        ` Không gửi được thông báo cho ${email}: ${err.message}`,
      );
    }

    return { success: true, message: 'Đã thêm thành viên' };
  }
}
