import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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

  @Get('search_food')
  searchfoods(@Query('food') food: string, @Query('lat') lat: number, @Query('lng') lng: number) {
    console.log('searchfoods 호출');
    console.log(food, lat, lng);
    return this.restaurantService.searchfoods(food, lat, lng);
  } 

  @Get('search')
  searchRestaurants(@Query('id') id: number) {
    console.log('search 호출');
    console.log(id);
    return this.restaurantService.searchRestaurants(id);
  }

  @Get('nearby')
  getNearbyRestaurants(@Query('lat') lat: number, @Query('lng') lng: number) {
    console.log(lat, lng);
    console.log('nearby 호출');
    return this.restaurantService.findNearby(lat, lng);
  }
}
