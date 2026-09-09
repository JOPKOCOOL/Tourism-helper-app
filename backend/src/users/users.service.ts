import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../generated/prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(_createUserDto: CreateUserDto) {
    if ((await this.findByEmail(_createUserDto.email)) !== null) {
      throw new ConflictException('Email already in use!');
    }
    const hashed = await bcrypt.hash(_createUserDto.password, 10);
    await this.prisma.user.create({
      data: {
        email: _createUserDto.email,
        password: hashed,
      },
    });
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: string) {
    return `This action returns a #${id} user`;
  }

  update(id: string, _updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user;
  }
}
