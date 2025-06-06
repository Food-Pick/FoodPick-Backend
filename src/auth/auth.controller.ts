import { Controller, Get,Post, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IdCheckDto } from './dto/id-check.dto';
import { UpdateProfileDto } from './dto/updateprofile.dto';
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

  @Post('update-profile')
  async updateProfile(@Body() updateProfileDto: UpdateProfileDto) {
    console.log('update-profile 호출');
    console.log(updateProfileDto);
    return this.authService.updateProfile(updateProfileDto);
  }

  @Post('update-auth-likes')
  async updateProfileLikes(@Body() body: any) {
    console.log('update-profile-likes 호출');
    console.log(body)
    return this.authService.updateProfileLikes(body)
  }

  @Get('get-auth-likes/:userId/:userEmail')
  async getAuthLikes(@Param('userId') userId: string, @Param('userEmail') userEmail: string) {
    console.log('get-auth-likes 호출');
    console.log(userId, userEmail)
    return this.authService.getAuthLikes(userId, userEmail)
  }
}
