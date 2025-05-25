import { IsNotEmpty, IsString } from 'class-validator';

export class IdCheckDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  email: string;
}
