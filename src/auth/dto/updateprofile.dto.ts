import { IsString, IsNotEmpty, IsNumber, IsEmail, IsOptional, IsArray } from "class-validator";

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  nickname: string;

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
