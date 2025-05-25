import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';
import { WeatherService } from './weather.service';
import * as fs from 'fs';
import * as path from 'path';

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
  ) {}

  // UTC 기준 시간을 KST(UTC+9)로 변환하는 함수
  private getKSTDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + 9 * 60 * 60 * 1000);
  }

  async getRecommendations(lat: number, lon: number, currentMealTime?: string) {
    // 날씨 정보를 먼저 가져옵니다. 날씨 의존 규칙에 필요합니다.
    const weather = await this.weatherService.getCurrentWeather(lat, lon);
    const currentTemp = parseFloat(weather.temperature); // 숫자로 변환
    const currentPrecip = parseFloat(weather.precipitation); // 숫자로 변환

    // currentMealTime이 없으면 시간대별로 자동 결정
    const now = this.getKSTDate();
    const hour = now.getHours();
    console.log(`Current KST Hour: ${hour}`);
    console.log(`Current KST Time: ${now}`);
    console.log('Weather:', weather);
    let mealTime = currentMealTime;
    if (!mealTime) {
      if (hour >= 6 && hour < 10) mealTime = '아침';
      else if (hour >= 10 && hour < 11) mealTime = '아점';
      else if (hour >= 11 && hour < 14) mealTime = '점심';
      else if (hour >= 14 && hour < 17) mealTime = '점저';
      else if (hour >= 17 && hour < 21) mealTime = '저녁';
      else mealTime = '야식';
    }
    console.log(`Determined Meal Time: ${mealTime}`);

    // 모든 식당 데이터 불러오기 (실제 서비스에서는 페이징/필터 필요)
    const allRestaurants = await this.restaurantRepository.find({
      take: 100, // 더 많은 데이터를 테스트하기 위해 take를 10000으로 조정
    });
    const recommendations = [];

    for (const restaurant of allRestaurants) {
      if (!restaurant.menu_tags) continue;

      let parsedRestaurantData: any;
      try {
        if (typeof restaurant.menu_tags === 'string') {
          parsedRestaurantData = JSON.parse(restaurant.menu_tags);
        } else if (
          typeof restaurant.menu_tags === 'object' &&
          restaurant.menu_tags !== null
        ) {
          parsedRestaurantData = restaurant.menu_tags;
        } else {
          console.error(
            `Invalid menu_tags type for restaurant ${restaurant.id}: ${typeof restaurant.menu_tags}. Skipping.`,
          );
          continue;
        }
      } catch (e) {
        console.error(
          `Error parsing or accessing menu_tags for restaurant ${restaurant.id}:`,
          e,
        );
        continue;
      }

      const actualMenuTagsObj = parsedRestaurantData.menu_tags;

      if (
        !actualMenuTagsObj ||
        typeof actualMenuTagsObj !== 'object' ||
        Array.isArray(actualMenuTagsObj) ||
        Object.keys(actualMenuTagsObj).length === 0
      ) {
        console.warn(
          `No valid menu items with tags found under 'menu_tags' key for restaurant ${restaurant.id}. Skipping.`,
        );
        continue;
      }

      for (const [menuName, tags] of Object.entries(actualMenuTagsObj)) {
        const matchedRulesForCurrentMenu = [];

        // 1. 날씨 의존 규칙 필터링
        const matchedWeatherDependentRules = weatherDependentRules.filter(
          (rule) => {
            const ruleName = rule.name; // 규칙 이름을 로그에 사용하기 위해 변수로 저장

            // 날씨 조건 확인
            if (rule.weather) {
              if (
                rule.weather.temperature?.lt &&
                !(currentTemp < rule.weather.temperature.lt)
              ) {
                console.log(
                  `[미매칭 - 날씨] 규칙: ${ruleName}, 식당: ${restaurant['사업장명']}, 메뉴: ${menuName} - 온도 낮음 조건 불일치: ${currentTemp} (현재) < ${rule.weather.temperature.lt} (규칙)`,
                );
                return false;
              }
              if (
                rule.weather.temperature?.gt &&
                !(currentTemp > rule.weather.temperature.gt)
              ) {
                console.log(
                  `[미매칭 - 날씨] 규칙: ${ruleName}, 식당: ${restaurant['사업장명']}, 메뉴: ${menuName} - 온도 높음 조건 불일치: ${currentTemp} (현재) > ${rule.weather.temperature.gt} (규칙)`,
                );
                return false;
              }
              if (
                rule.weather.precipitation?.gt &&
                !(currentPrecip > rule.weather.precipitation.gt)
              ) {
                console.log(
                  `[미매칭 - 날씨] 규칙: ${ruleName}, 식당: ${restaurant['사업장명']}, 메뉴: ${menuName} - 강수량 조건 불일치: ${currentPrecip} (현재) > ${rule.weather.precipitation.gt} (규칙)`,
                );
                return false;
              }
            }

            // 시간 조건 확인 (날씨 조건 통과 후)
            if (rule.meal_time && !rule.meal_time.includes(mealTime)) {
              console.log(
                `[미매칭 - 시간] 규칙: ${ruleName}, 식당: ${restaurant['사업장명']}, 메뉴: ${menuName} - 시간 조건 불일치: ${mealTime} (현재) not in ${rule.meal_time} (규칙)`,
              );
              return false;
            }

            // menu_tags 조건 확인 (날씨 및 시간 조건 통과 후)
            for (const [tag, values] of Object.entries(rule.menu_tags || {})) {
              if (
                !tags[tag] ||
                !Array.isArray(tags[tag]) ||
                !tags[tag].some((v: string) => (values as string[]).includes(v))
              ) {
                console.log(
                  `[미매칭 - 태그] 규칙: ${ruleName}, 식당: ${restaurant['사업장명']}, 메뉴: ${menuName} - 태그 불일치: ${tag}, 규칙값: ${values}, 실제값: ${tags[tag] || '없음'} (날씨/시간 조건 패스)`,
                );
                return false;
              }
            }
            // 모든 조건 통과 (날씨, 시간, 태그)
            console.log(
              `[매칭 성공] 규칙: ${ruleName}, 식당: ${restaurant['사업장명']}, 메뉴: ${menuName}`,
            );
            return true;
          },
        );
        matchedRulesForCurrentMenu.push(...matchedWeatherDependentRules);

        // 2. 날씨 독립 규칙 필터링 (날씨 조건 확인 없음)
        // 이 부분은 기존처럼 간단한 미매칭 로그를 유지합니다.
        const matchedWeatherIndependentRules = weatherIndependentRules.filter(
          (rule) => {
            // 시간 조건 확인
            if (rule.meal_time && !rule.meal_time.includes(mealTime)) {
              return false;
            }

            // menu_tags 조건 확인
            for (const [tag, values] of Object.entries(rule.menu_tags || {})) {
              if (
                !tags[tag] ||
                !Array.isArray(tags[tag]) ||
                !tags[tag].some((v: string) => (values as string[]).includes(v))
              ) {
                // 이 부분은 이전처럼 단순히 false를 반환하고 상세 로그는 생략합니다.
                // 필요하다면 이곳에도 상세 로그를 추가할 수 있습니다.
                return false;
              }
            }
            return true;
          },
        );
        matchedRulesForCurrentMenu.push(...matchedWeatherIndependentRules);

        // 디버깅: 각 메뉴별로 어떤 규칙이 매칭됐는지 출력 (최종 매칭된 규칙만)
        if (matchedRulesForCurrentMenu.length > 0) {
          console.log(
            `\n--- [최종 추천 후보 발견] 식당: ${restaurant['사업장명']}, 메뉴: ${menuName} ---`,
          );
          matchedRulesForCurrentMenu.forEach((rule) => {
            console.log(
              `  - 매칭된 규칙: ${rule.name} / 설명: ${rule.description}`,
            );
          });
        }

        // 매칭된 규칙이 있다면 추천 목록에 추가
        if (matchedRulesForCurrentMenu.length > 0) {
          // 중복 규칙 제거 (동일 메뉴가 여러 규칙에 매칭될 경우)
          const uniqueMatchedRules = Array.from(
            new Set(matchedRulesForCurrentMenu.map((r) => r.name)),
          ).map((name) =>
            matchedRulesForCurrentMenu.find((r) => r.name === name),
          );

          recommendations.push({
            restaurant_id: restaurant.id,
            restaurant_name: restaurant['사업장명'],
            menu: menuName,
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

    console.log(
      `Total recommendations found before shuffle: ${recommendations.length}`,
    );

    // 랜덤 25개 추출 (추천 메뉴가 많을 경우에 대비)
    const shuffled = recommendations.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 25);

    return {
      weather,
      mealTime,
      recommendations: selected,
    };
  }
}
