import { IsEmail, IsString } from 'class-validator';

export class _loginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
