/* eslint-disable prettier/prettier */
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

  @Get('search_food')
  searchfoods(
    @Query('food') food: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    // 입력값 검증
    if (!food || typeof food !== 'string') {
      return [];
    }

    // 좌표값 검증
    if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return [];
    }

    console.log('searchfoods 호출');
    console.log(food, lat, lng);
    return this.restaurantService.searchfoods(food, Number(lat), Number(lng));
  }

  @Get('search')
  searchRestaurants(@Query('id') id: number) {
    console.log('search 호출');
    console.log(id);
    return this.restaurantService.searchRestaurants(id);
  }

  @Get('search/category')
  searchByCategory(
    @Query('category') category: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('distance') distance?: number,
  ) {
    console.log('searchByCategory 호출');
    console.log(category);
    return this.restaurantService.searchByCategory(
      category as any,
      Number(lat),
      Number(lng),
      distance ? Number(distance) : undefined,
    );
  }

  @Get('nearby')
  getNearbyRestaurants(@Query('lat') lat: number, @Query('lng') lng: number) {
    console.log(lat, lng);
    console.log('nearby 호출');
    return this.restaurantService.findNearby(lat, lng);
  }

  @Get('randompick')
  getRandomPick(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.restaurantService.getRandomPick(lat, lng);
  }
}
