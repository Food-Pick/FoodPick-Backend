import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IdCheckDto } from './dto/id-check.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Post('login')
  // async login(@Body() body: any) {
  //   console.log('login 호출');
  //   console.log(body);
  // }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    console.log('login 호출');
    console.log(loginDto);
    return this.authService.login(loginDto);
  }

  @Post('register-check-id')
  async registerCheckId(@Body() idCheckDto: IdCheckDto) {
    console.log('register-check-id&email 호출');
    console.log(idCheckDto);
    return this.authService.registerCheckId(idCheckDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    console.log('register 호출');
    console.log(registerDto);
    return this.authService.register(registerDto);
  }
}
