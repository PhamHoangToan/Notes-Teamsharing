import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: any, _res: any, next: () => void) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('Thiếu Authorization header');

    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException('Token không hợp lệ');

    const user = await this.userService.verifyToken(token);
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    req.user = user;
    next();
  }
}
