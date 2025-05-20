import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../entity/auth.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private authRepository: Repository<Auth>,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.authRepository.findOne({
      where: { userId: loginDto.id }
    });

    if (!user) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    return { message: '로그인 성공' };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.authRepository.findOne({
      where: { userId: registerDto.id }
    });

    if (existingUser) {
      throw new ConflictException('이미 존재하는 아이디입니다.');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    //보안을 위해 비밀번호를 해싱하여 저장
    
    const user = this.authRepository.create({
      userId: registerDto.id,
      password: hashedPassword,
    });

    await this.authRepository.save(user);
    return { message: '회원가입 성공' };
  }
} 