import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';
import { RecommendController } from './recommend.controller';
import { RecommendService } from './recommend.service';
import { WeatherService } from './weather.service';
import { RestaurantModule } from 'src/restaurant/restaurant.module';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantMerged]), RestaurantModule],
  controllers: [RecommendController],
  providers: [RecommendService, WeatherService],
  exports: [RecommendService],
})
export class RecommendModule {}
