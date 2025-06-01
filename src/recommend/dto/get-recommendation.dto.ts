// src/recommend/dto/get-recommendation.dto.ts
import { IsNumber, IsOptional, IsString, IsArray, IsIn, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRecommendationDto {
  @IsNumber()
  @Type(() => Number) // 쿼리 파라미터는 기본적으로 문자열이므로 숫자로 변환
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lon: number;

  @IsOptional()
  @IsString()
  currentMealTime?: string; // 기존 recommend.service 용 (아침, 점심 등)

  @IsOptional()
  @IsString()
  @IsIn(['rule', 'gemini']) // 'rule' 또는 'gemini'만 허용
  recommendationType?: 'rule' | 'gemini' = 'rule'; // 기본값은 'rule'

  // --- GeminiRecommendService 용 파라미터 ---
  // recommendationType이 'gemini'일 때만 필수로 간주할 수 있도록 @IsOptional을 사용하지만,
  // 컨트롤러 로직에서 'gemini'일 경우 해당 필드들의 존재 여부를 수동으로 체크합니다.
  @IsOptional()
  @IsString()
  userAgeGroup?: string; // 예: "20대", "30대"

  @IsOptional()
  @IsString()
  userPricePreference?: string; // 예: "1만원대", "2만원대"

  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // 배열의 각 요소가 문자열인지 검사
  userFoodCategoryPreference?: string[]; // 예: ["한식", "양식", "중식"]
}