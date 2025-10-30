import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.schema';
import { Note } from '../note/note.schema';
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
     @InjectModel(Note.name) private readonly noteModel: Model<Note>, 
    private readonly jwtService: JwtService
  ) {}

  findAll() {
    return this.userModel.find().lean();
  }

  async create(data: Partial<User>) {
    const passwordHash = await bcrypt.hash(data.passwordHash || '', 10);
    const newUser = new this.userModel({
      ...data,
      passwordHash,
    });
    return newUser.save();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async findById(id: string) {
    return this.userModel.findById(id);
  }

  async searchByName(keyword: string) {
    return this.userModel
      .find({ username: { $regex: keyword, $options: 'i' } })
      .select('_id username email avatarUrl')
      .limit(10);
  }

  
  async register(username: string, email: string, password: string) {
    const existing = await this.userModel.findOne({ email });
    if (existing) throw new UnauthorizedException('Email đã tồn tại');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({ username, email, passwordHash });
    const token = this.jwtService.sign({ sub: user._id, email: user.email });

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      token,
    };
  }
  async updateProfile(
    
    id: string,
    data: Partial<{
      username: string;
      alias?: string;
      email: string;
      avatarUrl?: string;
    }>
    
  ) {
     console.log(' [UserService.updateProfile] data nhận:', data);
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (data.username) user.username = data.username;
    if (data.alias !== undefined) user.alias = data.alias;
    if (data.email) user.email = data.email;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;


    await user.save();
    console.log(' [UserService.updateProfile] saved user:', user);
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      alias: user.alias,
      avatarUrl: user.avatarUrl,
    };
  }



  async login(email: string, password: string) {
  const user = await this.userModel.findOne({ email });
  if (!user) throw new UnauthorizedException('Sai email hoặc mật khẩu');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedException('Sai email hoặc mật khẩu');

  const token = this.jwtService.sign({ sub: user._id.toString(), email: user.email });

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    alias: user.alias || '',
    avatarUrl: user.avatarUrl || '', 
    role: user.role || 'user',
    token,
  };
}

async getProfile(token: string) {
  const decoded = this.jwtService.verify(token);
  const user = await this.userModel.findById(decoded.sub);
  if (!user) throw new UnauthorizedException('User not found');

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    alias: user.alias || '',
    avatarUrl: user.avatarUrl || '',
  };
}


  async verifyToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      return this.userModel
  .findById(decoded.sub)
  .select('_id username email alias avatarUrl');

    } catch (e) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }


  async getNotesByUser(userId: string) {
  return this.noteModel
    .find({ ownerId: userId })
    .sort({ updatedAt: -1 })
    .lean();
}

}
