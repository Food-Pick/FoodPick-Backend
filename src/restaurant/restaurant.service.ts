import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(RestaurantMerged)
    private restaurantRepository: Repository<RestaurantMerged>,
  ) {}

  async getRestaurants(): Promise<RestaurantMerged[]> {
    return this.restaurantRepository.find({ take: 10 });
  }

  async searchfoods(
    name: string,
    lat: number,
    lng: number,
  ): Promise<RestaurantMerged[]> {
    const distance = 10000; // 10km
    const degreeRadius = distance / 111000;

    console.log('Search parameters:', {
      name,
      lat,
      lng,
      distance,
      degreeRadius,
    });

    const result = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .select([
        'restaurant.id',
        'restaurant.사업장명',
        'restaurant.도로명전체주소',
        'restaurant.menu',
        'restaurant.latitude',
        'restaurant.longitude',
        'restaurant.geom',
      ])
      .addSelect(
        `
    ST_Distance(
      restaurant.geom::geography,
      ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
    )
    `,
        'dist',
      )
      // 공간 필터를 먼저 `.where()`에 적용
      .where(
        `
    restaurant.geom && ST_Expand(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :degreeRadius)
    AND ST_DWithin(
      restaurant.geom::geography,
      ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
      :distance
    )
    `,
        { lat, lng, distance, degreeRadius },
      )
      // 문자열 필터: pgroonga 인덱스를 활용
      .andWhere('restaurant.menu &@~ :keyword', {
        keyword: name,
      })
      .orderBy('dist', 'ASC')
      .limit(25)
      .cache(true)
      .getMany();

    console.log('Query result:', {
      resultCount: result.length,
      // firstResult: result[0],
    });

    return result;
  }

  async searchRestaurants(id: number): Promise<RestaurantMerged[]> {
    if (id !== undefined) {
      return this.restaurantRepository.find({
        where: { id: id },
      });
    } else {
      throw new Error('id is undefined');
    }
  }

  async findNearby(lat: number, lng: number, distance = 3000) {
    const degreeRadius = distance / 111000;

    return this.restaurantRepository
      .createQueryBuilder('restaurant')
      .select([
        'restaurant.id',
        'restaurant.사업장명',
        'restaurant.menu',
        'restaurant.menu_tags',
        'restaurant.photo',
        'restaurant.latitude',
        'restaurant.longitude'
      ])
      .addSelect(
        `
      ST_Distance(
        restaurant.geom::geography,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
      )`,
        'dist',
      )
      .where(
        `
      restaurant.geom && ST_Expand(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :degreeRadius)
      AND ST_DWithin(
        restaurant.geom::geography,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
        :distance
      )
    `,
        { lat, lng, distance, degreeRadius },
      )
      .orderBy('dist', 'ASC')
      .limit(50)
      .cache(true)
      .getRawAndEntities();
  }
}
