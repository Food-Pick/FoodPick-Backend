// src/recommend/recommend.controller.ts
import { Controller, Get, Query, Logger, BadRequestException } from '@nestjs/common';
import { RecommendService } from './recommend.service'; // 기존 규칙 기반 서비스
import { GeminiRecommendService, GeminiApiResponse } from './gemini-recommend.service'; // 새로 추가할 Gemini 서비스
import { GetRecommendationDto } from './dto/get-recommendation.dto'; // 새로 생성한 DTO

// 기존 recommend_rules.json을 컨트롤러에서 직접 읽는 로직은 recommend.service.ts로 이동했으므로 제거합니다.
// import * as path from 'path'; // 제거
// import * as fs from 'fs';   // 제거

@Controller('recommend')
export class RecommendController {
  private readonly logger = new Logger(RecommendController.name);

  constructor(
    private readonly recommendService: RecommendService,
    private readonly geminiRecommendService: GeminiRecommendService, // Gemini 서비스 주입
  ) {}

  @Get()
  async getRecommendations(@Query() query: GetRecommendationDto): Promise<{
    weather: any;
    recommendations?: any[];
    recommendationResults?: any[];
    geminiResponse?: GeminiApiResponse;
  }> {
    // DTO를 통해 유효성 검사 및 타입 변환이 자동으로 이루어집니다.
    const {
      lat,
      lon,
      currentMealTime,
      recommendationType,
      userAgeGroup,
      userPricePreference,
      userFoodCategoryPreference,
    } = query;

    this.logger.log(`Recommendation request received. Type: ${recommendationType}, Lat: ${lat}, Lon: ${lon}`);

    if (recommendationType === 'gemini') {
      // Gemini 서비스는 특정 사용자 선호도 파라미터가 필수적이므로, 여기에 검증 로직을 추가합니다.
      if (!userAgeGroup || !userPricePreference || !userFoodCategoryPreference || userFoodCategoryPreference.length === 0) {
        throw new BadRequestException('Gemini 추천을 위해서는 userAgeGroup, userPricePreference, userFoodCategoryPreference(최소 1개)가 필수입니다.');
      }
      return this.geminiRecommendService.getGeminiRecommendations(
        lat,
        lon,
        userAgeGroup,
        userPricePreference,
        userFoodCategoryPreference,
      );
    } else {
      // 'rule' 타입이거나 recommendationType이 제공되지 않은 경우 (기본값) 기존 서비스를 사용합니다.
      return this.recommendService.getRecommendations(lat, lon, currentMealTime);
    }
  }
}