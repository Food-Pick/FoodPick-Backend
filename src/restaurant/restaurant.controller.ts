import { Controller, Get, Query } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { RestaurantMerged } from 'src/entity/restaurant-merged.entity';

@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get('test')
  test(): string {
    return 'test';
  }

  @Get()
  getRestaurants(): Promise<RestaurantMerged[]> {
    return this.restaurantService.getRestaurants();
  }

  @Get('nearby')
  getNearbyRestaurants(@Query('lat') lat: number, @Query('lng') lng: number) {
    console.log(lat, lng);
    console.log('nearby 호출');
    return this.restaurantService.findNearby(lat, lng);
  }
}
