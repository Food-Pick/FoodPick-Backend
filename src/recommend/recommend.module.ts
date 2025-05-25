import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';
import { RecommendController } from './recommend.controller';
import { RecommendService } from './recommend.service';
import { WeatherService } from './weather.service';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantMerged])],
  controllers: [RecommendController],
  providers: [RecommendService, WeatherService],
  exports: [RecommendService],
})
export class RecommendModule {} 