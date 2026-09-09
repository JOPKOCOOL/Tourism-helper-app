import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import type { StringValue } from 'ms';

interface RefreshTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly usersService: UsersService;
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;
  private readonly prisma: PrismaService;
  constructor(
    usersService: UsersService,
    jwtService: JwtService,
    configService: ConfigService,
    prisma: PrismaService,
  ) {
    this.usersService = usersService;
    this.jwtService = jwtService;
    this.configService = configService;
    this.prisma = prisma;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueRefreshToken(
    userId: string,
    email: string,
  ): Promise<{ token: string; id: string }> {
    const payload: RefreshTokenPayload = { sub: userId, email };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as StringValue,
    });
    const { exp } = this.jwtService.decode<{ exp: number }>(token);

    const created = await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(token),
        userId,
        expiresAt: new Date(exp * 1000),
      },
    });

    return { token, id: created.id };
  }

  async rotateRefreshToken(rawToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        rawToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      return null;
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return null;
    }

    if (stored.revokedAt) {
      // Reuse of an already-rotated/revoked token — treat as compromise
      // and kill every other active session for this user.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return null;
    }

    const issued = await this.issueRefreshToken(payload.sub, payload.email);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenId: issued.id },
    });

    const accessToken = this.jwtService.sign({
      sub: payload.sub,
      email: payload.email,
    });
    const { exp } = this.jwtService.decode<{ exp: number }>(issued.token);
    return {
      accessToken,
      refreshToken: issued.token,
      refreshTokenExpiresAt: new Date(exp * 1000),
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (user === null) {
      return null;
    }
    const matches = await bcrypt.compare(password, user.password);
    if (matches) {
      return user;
    }
    return null;
  }
  async login(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const issued = await this.issueRefreshToken(user.id, user.email);
    const { exp } = this.jwtService.decode<{ exp: number }>(issued.token);
    return {
      accessToken,
      refreshToken: issued.token,
      refreshTokenExpiresAt: new Date(exp * 1000),
    };
  }
  async register(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
