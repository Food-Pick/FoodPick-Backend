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

  async searchfoods(name: string, lat: number, lng: number): Promise<RestaurantMerged[]> {
    const distance = 10000; // 10km
    const degreeRadius = distance / 111000;

    console.log('Search parameters:', { name, lat, lng, distance, degreeRadius });

    const result = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .select([
        'restaurant.id',
        'restaurant.사업장명',
        'restaurant.도로명전체주소',
        'restaurant.menu',
        'restaurant.latitude',
        'restaurant.longitude',
        'restaurant.geom'
      ])
      .addSelect(
        `
        ST_Distance(
          restaurant.geom::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'dist',
      )
      .where('LOWER(restaurant.menu) LIKE LOWER(:name)', { name: `%${name}%` })
      .andWhere(
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
      .limit(10)
      .cache(true)
      .getMany();

    console.log('Query result:', {
      resultCount: result.length,
      firstResult: result[0],
    });

    return result;
  }

  async searchRestaurants(id: number): Promise<RestaurantMerged[]> {
    if (id !== undefined) {
    return this.restaurantRepository.find({
      where: { id: id },
    });
    }
    else {
      throw new Error('id is undefined'); 
    }
  }

  async findNearby(lat: number, lng: number, distance = 3000) {
    const degreeRadius = distance / 111000;

    return this.restaurantRepository
      .createQueryBuilder('restaurant')
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
      .getRawAndEntities();
  }
}