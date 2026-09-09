import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { _loginUserDto } from 'src/users/dto/login-user.dto';
import { Public } from './decorators/public.decorator';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/auth';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: expiresAt,
    });
  }

  private getRefreshTokenFromRequest(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_TOKEN_COOKIE
    ];
  }

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }
  @Post('login')
  async login(
    @Body() dto: _loginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (user === null) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { accessToken, refreshToken, refreshTokenExpiresAt } =
      await this.authService.login(user);

    this.setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresAt);

    return { access_token: accessToken };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = this.getRefreshTokenFromRequest(req);
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.authService.rotateRefreshToken(rawToken);
    if (result === null) {
      res.clearCookie(REFRESH_TOKEN_COOKIE, {
        path: REFRESH_TOKEN_COOKIE_PATH,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.setRefreshTokenCookie(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return { access_token: result.accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = this.getRefreshTokenFromRequest(req);
    if (rawToken) {
      await this.authService.revokeRefreshToken(rawToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_COOKIE_PATH });
    return { success: true };
  }
}
