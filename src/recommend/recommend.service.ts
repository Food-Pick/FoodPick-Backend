import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';
import { WeatherService } from './weather.service';
import * as fs from 'fs';
import * as path from 'path';
import { RestaurantService } from 'src/restaurant/restaurant.service';
// JSON 파일에서 규칙을 로드할 때, 새로운 구조를 반영
const allRules = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'src', 'recommend', 'recommend_rules.json'),
    'utf-8',
  ),
);
const weatherDependentRules = allRules.weatherDependentRules;
const weatherIndependentRules = allRules.weatherIndependentRules;

@Injectable()
export class RecommendService {
  constructor(
    @InjectRepository(RestaurantMerged)
    private restaurantRepository: Repository<RestaurantMerged>,
    private weatherService: WeatherService,
    private restaurantService: RestaurantService,
  ) {
    console.log('--- Loaded Rules on Service Init ---');
    console.log(
      'Weather Dependent Rules:',
      JSON.stringify(weatherDependentRules, null, 2),
    );
    console.log('------------------------------------');
  }

  // UTC 기준 시간을 KST(UTC+9)로 변환하는 함수
  private getKSTDate(): Date {
    const now = new Date();
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    
    // 오전 1시 이전이면 이전 날짜로 처리
    if (kstDate.getHours() < 1) {
      kstDate.setDate(kstDate.getDate() - 1);
      kstDate.setHours(kstDate.getHours() + 24); // 시간을 24시간 더해서 이전 날짜의 같은 시간으로 설정
    }
    
    return kstDate;
  }

  async getRecommendations(lat: number, lon: number, currentMealTime?: string) {
    // 날씨 정보를 먼저 가져옵니다. 날씨 의존 규칙에 필요합니다.
    const weather = await this.weatherService.getCurrentWeather(lat, lon);
    const currentTemp = parseFloat(weather.temperature);
    const currentPrecip = parseFloat(weather.precipitation);

    // currentMealTime이 없으면 시간대별로 자동 결정
    const now = this.getKSTDate();
    const hour = now.getHours();
    let mealTime = currentMealTime;
    if (!mealTime) {
      if (hour >= 6 && hour < 10) mealTime = '아침';
      else if (hour >= 10 && hour < 11) mealTime = '아점';
      else if (hour >= 11 && hour < 14) mealTime = '점심';
      else if (hour >= 14 && hour < 17) mealTime = '점저';
      else if (hour >= 17 && hour < 21) mealTime = '저녁';
      else mealTime = '야식';
    }

    // 날씨 조건에 맞는 규칙만 미리 필터링
    const applicableWeatherRules = weatherDependentRules.filter((rule) => {
      if (!rule.weather) return true;
      const { temperature, precipitation } = rule.weather;

      if (temperature?.lt !== undefined && currentTemp >= temperature.lt)
        return false;
      if (temperature?.gt !== undefined && currentTemp <= temperature.gt)
        return false;
      if (precipitation?.gt !== undefined && currentPrecip <= precipitation.gt)
        return false;

      return true;
    });

    // 시간 조건에 맞는 규칙만 미리 필터링
    const applicableTimeRules = [
      ...applicableWeatherRules,
      ...weatherIndependentRules,
    ].filter((rule) => !rule.meal_time || rule.meal_time.includes(mealTime));

    const { entities: allRestaurants } =
      await this.restaurantService.findNearby(lat, lon, 10000);
    const recommendations = [];

    for (const restaurant of allRestaurants) {
      if (!restaurant.menu_tags) continue;

      let parsedRestaurantData: any;
      try {
        parsedRestaurantData =
          typeof restaurant.menu_tags === 'string'
            ? JSON.parse(restaurant.menu_tags)
            : restaurant.menu_tags;
      } catch (e) {
        console.error(
          `Error parsing menu_tags for restaurant ${restaurant.id}:`,
          e,
        );
        continue;
      }

      const actualMenuTagsObj = parsedRestaurantData.menu_tags;
      if (
        !actualMenuTagsObj ||
        typeof actualMenuTagsObj !== 'object' ||
        Array.isArray(actualMenuTagsObj)
      ) {
        continue;
      }

      // 음식점 이미지 처리
      let restaurantPhoto = restaurant['photo'];
      if (typeof restaurantPhoto === 'string') {
        try {
          const arr = JSON.parse(restaurantPhoto);
          if (Array.isArray(arr)) restaurantPhoto = arr[0];
        } catch {
          // 단일 URL 문자열일 경우 그대로 사용
        }
      } else if (Array.isArray(restaurantPhoto)) {
        restaurantPhoto = restaurantPhoto[0];
      }

      for (const [menuName, tags] of Object.entries(actualMenuTagsObj)) {
        const matchedRules = applicableTimeRules.filter((rule) => {
          for (const [tag, values] of Object.entries(rule.menu_tags || {})) {
            if (
              !tags[tag] ||
              !Array.isArray(tags[tag]) ||
              !tags[tag].some((v: string) => (values as string[]).includes(v))
            ) {
              return false;
            }
          }
          return true;
        });

        if (matchedRules.length > 0) {
          const uniqueMatchedRules = Array.from(
            new Set(matchedRules.map((r) => r.name)),
          ).map((name) => matchedRules.find((r) => r.name === name));

          let specificMenuImageUrl: string | null = null;
          try {
            const menuDetails = JSON.parse(restaurant.menu);
            if (Array.isArray(menuDetails)) {
              const matchedMenuItem = menuDetails.find(
                (item) => item.name === menuName,
              );
              if (matchedMenuItem?.images?.[0]) {
                specificMenuImageUrl = matchedMenuItem.images[0];
              }
            }
          } catch (e) {
            console.warn(
              `Could not parse menu details for restaurant ${restaurant.id}`,
            );
          }

          recommendations.push({
            restaurant_id: restaurant.id,
            restaurant_name: restaurant['사업장명'],
            restaurant_image_url: restaurantPhoto || null,
            menu: menuName,
            menu_image_url: specificMenuImageUrl,
            matched_rules: uniqueMatchedRules.map((r) => r.name),
            descriptions: uniqueMatchedRules.map((r) => r.description),
            matched_tags: uniqueMatchedRules.map((rule) => {
              const obj: any = {};
              for (const tag of Object.keys(rule.menu_tags || {})) {
                if (tags[tag] !== undefined) {
                  obj[tag] = tags[tag];
                }
              }
              return obj;
            }),
            applied_rules_details: uniqueMatchedRules.map((rule) => ({
              name: rule.name,
              description: rule.description,
              weather_condition: rule.weather || {},
              meal_time_condition: rule.meal_time || [],
              menu_tags_condition: rule.menu_tags || {},
            })),
          });
        }
      }
    }

    // 같은 음식점의 메뉴들을 그룹화
    const groupedRecommendations = recommendations.reduce((acc, curr) => {
      const existingRestaurant = acc.find(
        (item) => item.restaurant_id === curr.restaurant_id,
      );

      if (existingRestaurant) {
        existingRestaurant.menus.push({
          name: curr.menu,
          image_url: curr.menu_image_url,
          matched_rules: curr.matched_rules,
          descriptions: curr.descriptions,
          matched_tags: curr.matched_tags,
          applied_rules_details: curr.applied_rules_details,
        });
      } else {
        acc.push({
          restaurant_id: curr.restaurant_id,
          restaurant_name: curr.restaurant_name,
          restaurant_image_url: curr.restaurant_image_url,
          menus: [
            {
              name: curr.menu,
              image_url: curr.menu_image_url,
              matched_rules: curr.matched_rules,
              descriptions: curr.descriptions,
              matched_tags: curr.matched_tags,
              applied_rules_details: curr.applied_rules_details,
            },
          ],
        });
      }
      return acc;
    }, []);

    const shuffled = groupedRecommendations.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 25);

    return {
      weather,
      mealTime,
      recommendations: selected,
    };
  }
}
