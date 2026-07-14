import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const user = await this.usersService.create(email, password, name);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.email, user.role);
  }


  

  async refresh(userId: string, refreshToken: string) {
    const stored = await this.redisService.get(`refresh:${userId}`);
    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(userId);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.redisService.del(`refresh:${userId}`);
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessTokenTtl = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const refreshTokenTtl = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');



   const accessToken = this.jwtService.sign(payload, {
  secret: this.configService.get<string>('JWT_SECRET'),
  expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') as any,
});

const refreshToken = this.jwtService.sign(payload, {
  secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
  expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') as any,
});

    // store refresh token in Redis so it can be revoked on logout
    await this.redisService.set(`refresh:${userId}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }
}