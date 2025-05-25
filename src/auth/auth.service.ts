import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../entity/auth.entity';
import * as bcrypt from 'bcrypt';
import { IdCheckDto } from './dto/id-check.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth)
    private authRepository: Repository<Auth>,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.authRepository.findOne({
      where: { userId: loginDto.id },
    });

    console.log(user);

    if (!user) {
      throw new UnauthorizedException({
        message: '아이디가 존재하지 않습니다.',
        code: 'USER_NOT_FOUND',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: '비밀번호가 일치하지 않습니다.',
        code: 'INVALID_PASSWORD',
      });
    }

    console.log('로그인 성공', user);

    return {
      message: '로그인 성공',
      id: user.userId,
      nickname: user.nickname,
      email: user.email,
      gender: user.gender,
      age: user.age,
      favorite_food: user.favorite_food,
    };
  }

  async registerCheckId(idCheckDto: IdCheckDto) {
    const existingUser = await this.authRepository.findOne({
      where: { userId: idCheckDto.id },
    });

    const existingUserByEmail = await this.authRepository.findOne({
      where: { email: idCheckDto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 존재하는 아이디입니다.');
    }

    if (existingUserByEmail) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    return { message: '아이디 중복 확인 성공' };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.authRepository.findOne({
      where: { userId: registerDto.id },
    });

    const existingUserByEmail = await this.authRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 존재하는 아이디입니다.');
    }

    if (existingUserByEmail) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    //보안을 위해 비밀번호를 해싱하여 저장

    const user = this.authRepository.create({
      userId: registerDto.id,
      password: hashedPassword,
      nickname: registerDto.nickname,
      email: registerDto.email,
      gender: registerDto.gender,
      age: registerDto.age,
      favorite_food: registerDto.favorite_food,
    });

    await this.authRepository.save(user);
    return { message: '회원가입 성공' };
  }
}
