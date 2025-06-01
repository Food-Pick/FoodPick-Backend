import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsEmail,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: '아이디는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '아이디를 입력해주세요.' })
  @MinLength(4, { message: '아이디는 최소 4자 이상이어야 합니다.' })
  id: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다.' })
  password: string;

  @IsString({ message: '닉네임은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
  nickname: string;

  @IsString({ message: '이메일은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다.' })
  email: string;

  @IsNumber()
  @IsNotEmpty({ message: '성별을 입력해주세요.' })
  gender: number;

  @IsNumber()
  @IsNotEmpty({ message: '연령대 코드를 입력해주세요.' })
  age: number;

  @IsString({ message: '가격대 코드를 입력해주세요.' })
  @IsNotEmpty({ message: '가격대 코드를 입력해주세요.' })
  price: string;

  @IsArray({ message: '선호 음식은 배열이어야 합니다.' })
  @IsString({ each: true, message: '선호 음식은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '선호 음식을 입력해주세요.' })
  favorite_food: string[];
}
