import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';

// 카테고리 매핑 상수 정의
const CATEGORY_MAPPING = {
  korean: [
    '한식',
    '분식',
    '냉면집',
    '식육(숯불구이)',
    '탕류(보신용)',
    '김밥(도시락)',
  ],
  chinese: ['중국식'],
  japanese: ['일식', '횟집', '복어취급'],
  western: [
    '경양식',
    '패밀리레스트랑',
    '패스트푸드',
    '외국음식전문점(인도,태국등)',
    '뷔페식',
  ],
  cafe: ['까페', '전통찻집', '라이브카페', '키즈카페'],
  pub: ['호프/통닭', '감성주점', '통닭(치킨)', '정종/대포집/소주방'],
  etc: ['기타', '이동조리', '출장조리', '기타 휴게음식점', null],
} as const;

type CategoryType = keyof typeof CATEGORY_MAPPING;

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
        'restaurant.longitude',
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

  async getRandomPick(lat: number, lng: number, distance = 3000) {
    const degreeRadius = distance / 111000;
    const randomRestaurant = this.restaurantRepository
      .createQueryBuilder('restaurant')
      .select([
        'restaurant.id',
        'restaurant.사업장명',
        'restaurant.menu',
        'restaurant.menu_tags',
        'restaurant.photo',
        'restaurant.latitude',
        'restaurant.longitude',
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
      .limit(500)
      .cache(true)
      .getRawAndEntities();

    const { entities } = await randomRestaurant;
    console.log('총 레스토랑 수', entities.length);
    return randomRestaurant;
  }

  async searchByCategory(
    category: CategoryType,
    lat: number,
    lng: number,
    distance = 3000,
  ) {
    const degreeRadius = distance / 111000;
    const businessTypes = CATEGORY_MAPPING[category];

    // 키워드 기반 보정 조건 정의 (카테고리별로 필요한 키워드 지정 가능)
    const categoryKeywordMap: Record<CategoryType, string[]> = {
      korean: ['한식', '떡볶이', '비빔밥'],
      chinese: ['중국집', '짜장', '짬뽕'],
      japanese: ['일식', '초밥', '사시미', '스시'],
      western: ['파스타', '스테이크', '피자', '레스토랑'],
      cafe: ['카페', '커피', '라떼', '디저트'],
      pub: ['호프', '맥주', '술집', '포차'],
      etc: [],
    };

    console.log('category', category);
    const keywordRegex =
      categoryKeywordMap[category].length > 0
        ? categoryKeywordMap[category].join('|')
        : null;

    console.log('category', category);
    const result = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .select([
        'restaurant.id',
        'restaurant.사업장명',
        'restaurant.menu',
        'restaurant.menu_tags',
        'restaurant.photo',
        'restaurant.latitude',
        'restaurant.longitude',
        'restaurant.업태구분명',
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
      AND (
        restaurant.업태구분명 IN (:...businessTypes)
        OR (restaurant.업태구분명 IS NULL AND :category = 'etc')
        ${keywordRegex ? 'OR (restaurant.사업장명 ~* :keywordRegex OR restaurant.menu ~* :keywordRegex)' : ''}
      )
    `,
        {
          lat,
          lng,
          distance,
          degreeRadius,
          businessTypes,
          category,
          ...(keywordRegex ? { keywordRegex } : {}),
        },
      )
      .orderBy('dist', 'ASC')
      .limit(50)
      .cache(true)
      .getRawAndEntities();

    console.log('result', result);
    return result;
  }
}
