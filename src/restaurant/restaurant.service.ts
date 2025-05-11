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

  async searchRestaurants(id: number): Promise<RestaurantMerged[]> {
    return this.restaurantRepository.find({
      where: { id: id },
    });
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