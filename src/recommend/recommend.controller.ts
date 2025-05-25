import { Controller, Get, Query } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import * as path from 'path';
import * as fs from 'fs';

@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  @Get()
  async getRecommendations(
    @Query('lat') lat: number,
    @Query('lon') lon: number,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const rulesPath = path.join(
      process.cwd(),
      'src',
      'recommend',
      'recommend_rules.json',
    );
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

    return this.recommendService.getRecommendations(lat, lon);
  }
}
