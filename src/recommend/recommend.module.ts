import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';
import { RecommendController } from './recommend.controller';
import { RecommendService } from './recommend.service';
import { WeatherService } from './weather.service';
import { RestaurantModule } from 'src/restaurant/restaurant.module';
import { GeminiRecommendService } from './gemini-recommend.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantMerged]), RestaurantModule, ConfigModule],
  controllers: [RecommendController],
  providers: [RecommendService, WeatherService, GeminiRecommendService],
  exports: [RecommendService],
})
export class RecommendModule {}
