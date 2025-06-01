// src/recommend/gemini-recommend.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantMerged } from '../entity/restaurant-merged.entity';
import { WeatherService } from './weather.service';
import { RestaurantService } from '../restaurant/restaurant.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiRecommendationOption {
  recommended_tags: { [key: string]: string[] };
  recommendation_reason: string;
}

export interface GeminiApiResponse {
  recommendation_options: GeminiRecommendationOption[];
}

@Injectable()
export class GeminiRecommendService {
  private readonly logger = new Logger(GeminiRecommendService.name);
  // private readonly GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';
  private readonly GEMINI_MODEL = 'gemini-2.0-flash';
  private readonly geminiClient: GoogleGenerativeAI;
  private geminiReady: Promise<void>;

  constructor(
    @InjectRepository(RestaurantMerged)
    private restaurantRepository: Repository<RestaurantMerged>,
    private weatherService: WeatherService,
    private restaurantService: RestaurantService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not set in environment variables.');
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    this.geminiClient = new GoogleGenerativeAI(apiKey);
    this.geminiReady = this.initGeminiClient();
  }

  private async initGeminiClient() {
    // This method is now empty as the client is initialized in the constructor
  }

  // UTC → KST 변환
  private getKSTDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + 9 * 60 * 60 * 1000);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getDayOfWeek(date: Date): string {
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return dayNames[date.getDay()];
  }

  async getGeminiRecommendations(
    lat: number,
    lon: number,
    userAgeGroup: string,
    userPricePreference: string,
    userFoodCategoryPreference: string[],
  ) {
    await this.geminiReady;
    // 1. 현재 날씨 정보
    const weather = await this.weatherService.getCurrentWeather(lat, lon);
    const temperatureCelsius = parseFloat(weather.temperature);
    const precipitationAmount = parseFloat(weather.precipitation);
    const humidityPercentage = parseFloat(weather.humidity);
    const precipitationStatus =
      precipitationAmount > 0
        ? weather.precipitationType === '1'
          ? '비'
          : '눈'
        : '없음';

    // 2. 현재 시간/날짜 정보
    const kstDate = this.getKSTDate();
    const currentHour = kstDate.getHours();
    const currentDate = this.formatDate(kstDate);
    const dayOfWeek = this.getDayOfWeek(kstDate);
    const region = '대한민국';

    // 3. Gemini 프롬프트/페이로드
    const promptContent = `
    당신은 사용자의 선호도 정보, 현재 기상 정보, 현재 시간대, 그리고 현재 지역과 날짜/요일을 종합적으로 분석하여, 음식 메뉴 추천에 사용할 최적의 태그 조합을 생성하는 전문 큐레이터입니다. 당신은 주어진 모든 정보를 깊이 이해하고, 사용자에게 가장 적합한 음식 메뉴의 특징(태그)을 파악하여 데이터베이스 쿼리에 활용될 JSON 형식의 태그 목록을 생성해야 합니다. 특히, 사용자의 현재 상황(선호도, 기상, 시간, 요일, 지역적 맥락)에 완벽하게 어울리는 메뉴 특징을 제안하는 동시에, 고객에게 감성적으로 깊이 다가가는 추천 이유를 제공하는 것이 당신의 핵심 역할입니다.
    
    **[기존 음식 메뉴 태깅 기준 및 선택지]**
    (이전에 Gemini가 학습하거나 참고했던 태깅 기준을 다시 한번 명시적으로 제공하여, 일관성 있는 태그 생성을 유도합니다. 아래 내용을 그대로 사용해주세요.)
    
    1.  **온도감**: ["매우뜨거움", "뜨거움", "따뜻함", "미지근함", "상온", "시원함", "차가움", "얼음처럼차가움"] (주로 1개 선택)
    2.  **맵기**: ["안매움", "순한매운맛", "약간매움", "보통매움", "매움", "아주매움", "극한매움"] (주로 1개 선택)
    3.  **조리방식**: ["국", "탕", "찌개", "전골", "찜", "조림", "구이", "직화구이", "철판구이", "숯불구이", "오븐구이", "그라탕", "볶음", "튀김", "부침/전", "데침", "무침", "비빔", "회/날것", "숙성회", "면요리", "밥요리", "덮밥", "볶음밥", "비빔밥", "쌈", "샐러드", "말이/롤", "샌드위치/토스트", "빵/베이킹", "삶음", "훈제", "절임/장아찌", "숙성"] (1~3개 선택, 가장 대표적인 것 위주)
    4.  **음식카테고리**: ["한식", "일식", "중식", "양식", "이탈리안", "프렌치", "스페니쉬", "멕시칸", "미국식", "인도음식", "태국음식", "베트남음식", "동남아음식", "아시아퓨전", "세계요리", "퓨전한식", "퓨전일식", "퓨전양식", "분식", "길거리음식", "패스트푸드", "치킨", "피자", "햄버거", "샌드위치전문", "샐러드전문", "도시락/간편식", "백반/가정식", "죽전문", "수프전문", "베이커리/빵집", "디저트카페", "전통디저트", "아이스크림/빙수", "카페/커피전문점", "브런치카페", "음료전문점", "주점/바", "이자카야", "포장마차", "뷔페/무한리필", "코스요리전문"] (대표적인 것 1~2개, 가장 구체적인 카테고리 우선)
    5.  **주요재료**: ["소고기", "돼지고기", "닭고기", "오리고기", "양고기", "계란/알류", "우유/유제품", "생선", "고등어", "갈치", "꽁치", "조기", "명태/코다리", "장어", "연어", "참치", "광어/우럭", "도미", "아구", "새우", "게/꽃게", "랍스터", "오징어", "문어", "낙지", "쭈꾸미", "전복", "소라/고둥", "홍합", "바지락", "꼬막", "가리비", "기타조개류", "멍게/해삼", "해산물모듬", "두부/유부", "콩/견과류", "버섯모듬", "송이버섯", "표고버섯", "새송이버섯", "팽이버섯", "양송이버섯", "채소모듬", "양파", "마늘", "파", "고추", "토마토", "오이", "가지", "호박", "감자", "고구마", "옥수수", "과일모듬", "사과", "배", "딸기", "바나나", "치즈", "모짜렐라치즈", "체다치즈", "크림치즈", "크림/생크림", "버터", "토마토소스", "로제소스", "크림소스", "오일소스", "김치", "된장/고추장", "쌀/밥", "현미/잡곡", "밀가루/면류", "파스타면", "라면사리", "우동면", "소바면", "떡", "순대", "어묵", "김/해조류", "허브/향신료", "초콜릿", "꿀/시럽", "잼"] (핵심 재료 1~4개, 가장 특징적인 재료 위주)
    6.  **맛특징**: ["단맛", "짠맛", "신맛", "쓴맛", "감칠맛(우마미)", "매운맛", "매콤함", "칼칼함", "얼큰함", "알싸함", "고소함", "기름진맛", "담백함", "느끼함", "상큼함", "새콤달콤함", "짭짤달콤함(단짠)", "개운함/깔끔함", "시원한맛(청량감)", "깊은맛/풍미깊은", "부드러운식감", "쫄깃한식감", "바삭한식감", "아삭한식감", "촉촉한식감", "꾸덕한식감", "자극적이지않은/순한맛", "향긋함", "톡쏘는맛", "씁쓸함", "불맛/훈제향", "발효된맛"] (대표적인 맛 특징 1~3개)
    7.  **식사유형_상황**: ["아침식사", "브런치", "점심메뉴", "점심저녁", "저녁만찬", "야식땡길때", "늦은야식", "혼밥하기좋은", "혼술하기좋은", "간단한한끼", "든든한보양식", "일상해장", "특별한해장", "가벼운술안주", "든든한술안주", "아이동반외식", "부모님과함께", "가족모임", "친구와수다", "연인과데이트", "소개팅장소", "회사점심", "팀회식", "단체회식(대규모)", "워크샵/MT", "특별한날기념", "생일파티", "기념일데이트", "프로포즈", "건강챙길때", "다이어트중", "채식주의자용", "비건옵션", "가성비끝판왕", "가심비최고", "분위기좋은", "뷰맛집", "프리미엄만찬", "집들이음식추천", "피크닉도시락", "선물하기좋은", "비오는날생각나는", "더운날입맛돋우는", "추운날몸녹이는", "시험기간에너지충전"] (1~3개 선택, 가장 적합한 것 위주)
    8.  **가격대**: (가격 정보가 없거나 "변동", "싯가", "문의" 등 숫자로 판단 불가능한 경우: "가격문의필요" (또는 "가격정보없음"), 10000원 미만: "1만원미만", 10000원 이상 20000원 미만: "1만원대", 20000원 이상 30000원 미만: "2만원대", 30000원 이상 50000원 미만: "3-4만원대", 50000원 이상 100000원 미만: "5만원이상", 100000원 이상: "10만원이상")
    
[지시 사항]
사용자 선호도, 현재 기상 정보, 현재 시간(current_context.current_time_hour), **그리고 지역(current_context.region)과 날짜/요일(current_context.current_date, current_context.day_of_week)**을 종합적으로 고려하여, 최소 3개 이상, 최대 10개의 다양한 추천 조합을 생성해주세요.
각 추천 조합(recommended_tags)은 각 태그 유형별로 1~3개 정도의 가장 적합한 태그를 선택하여 JSON 배열 형태로 값을 포함해주세요.
각 추천은 서로 다른 매력이나 상황(예: '가볍게 즐길 수 있는', '든든하게 채울 수 있는', '색다른 경험을 줄 수 있는' 등)에 초점을 맞춰, 주요 태그 조합이 의미 있게 중복되지 않도록 해주세요.
특히 current_context.current_time_hour와 current_context.day_of_week를 바탕으로 식사유형_상황 태그를 유연하고 맥락적으로 선택해주세요. 단순한 시간 구간만을 고려하기보다, 사용자의 나이대, 선호도, 기상 조건, 요일별 사회적 분위기 등 다른 모든 정보와 시너지를 내어 최적의 식사 시간대와 상황을 판단해야 합니다.
만약 어떤 태그 유형에 해당하는 태그가 현재 정보로 추천하기 어렵거나 불필요하다고 판단되면, 해당 키를 JSON 출력에서 제외해주세요.
태그는 반드시 위 [기존 음식 메뉴 태깅 기준 및 선택지] 내의 용어만 사용해야 합니다.
최종 출력 JSON은 recommendation_options라는 키 아래에 여러 개의 추천 객체를 배열로 담아주세요.
각 추천 객체는 recommended_tags 객체와 함께, 해당 추천 조합에 대한 사용자에게 친근하고 감성적인 'recommendation_reason'을 한국어로 덧붙여 설명해주세요.
recommendation_reason은 단순한 사실 나열을 넘어, 사용자의 현재 기분, 날씨, 현재 시간대와 요일, 그리고 한국의 문화적 배경과 같은 상황에 깊이 공감하며, 추천 메뉴가 가져다줄 긍정적인 경험(맛, 식감, 만족감, 위로, 에너지 등)을 감성적이고 친근한 문구로 상기시켜야 합니다.
사용자의 입력 정보(나이대, 가격대, 시간, 온도, 선호 카테고리, 요일, 날짜 등)는 recommendation_reason에 직접적으로 언급하지 않고, 그 정보들이 내포하는 상황과 감정에 집중하여 묘사합니다.
마치 실제 사람이 대화하듯이 친근하고 자연스러운 어조를 사용해주세요.

    **[출력 형식 예시]**
    \`\`\`json
    {
      "recommendation_options": [
        {
          "recommended_tags": {
            "온도감": ["따뜻함", "매우뜨거움"],
            "맵기": ["얼큰함", "칼칼함"],
            "조리방식": ["탕", "전골", "찌개"],
            "음식카테고리": ["한식", "퓨전한식"],
            "주요재료": ["소고기", "돼지고기", "버섯모듬", "두부/유부", "김치", "채소모듬"],
            "맛특징": ["깊은맛/풍미깊은", "개운함/깔끔함", "얼큰함"],
            "식사유형_상황": ["저녁만찬", "가족모임", "비오는날생각나는", "든든한술안주"],
            "가격대": ["3-4만원대"]
          },
          "recommendation_reason": "비 오는 저녁, 빗소리와 함께 마음까지 따뜻하게 채워줄 뜨끈하고 얼큰한 국물 요리 어떠세요? 깊은 맛이 우러나는 전골이나 찌개는 하루의 피로를 녹여주고, 소중한 분들과 도란도란 이야기 나누며 든든하게 즐기기에 더할 나위 없을 거예요. 품격 있는 저녁 식사를 위한 완벽한 선택입니다."
        }
      ]
    }
    \`\`\`
    `;
    

    const userPromptPayload = {
      user_preferences: {
        age_group: userAgeGroup,
        price_preference: userPricePreference,
        food_category_preference: userFoodCategoryPreference,
      },
      weather_conditions: {
        temperature_celsius: temperatureCelsius,
        precipitation: precipitationStatus,
        humidity_percentage: humidityPercentage,
      },
      current_context: {
        current_time_hour: currentHour,
        region,
        current_date: currentDate,
        day_of_week: dayOfWeek,
      },
    };

    const userInput =
      promptContent + '\n' + JSON.stringify(userPromptPayload, null, 2);

    let geminiResponse: GeminiApiResponse;

    console.log(userPromptPayload);
    try {
      const startTime = Date.now();
      const model = this.geminiClient.getGenerativeModel({ model: this.GEMINI_MODEL });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userInput }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 1,
          topK: 1,
          maxOutputTokens: 65536,
        },
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;
      const text = result.response.text();
      this.logger.debug(`Raw Gemini response: ${text}`);
      this.logger.log(`Gemini API 호출 완료 - 소요시간: ${executionTime}ms`);


      // JSON 추출 로직 개선
      let jsonString = text;
      // 마크다운 코드 블록에서 JSON 추출
      const jsonMatch = text.match(/```(?:json)?\n([\s\S]+?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1].trim();
      } else {
        // 마크다운이 없는 경우, 텍스트에서 JSON 객체만 추출
        const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonString = jsonObjectMatch[0];
        }
      }

      // this.logger.debug(`Extracted JSON string: ${jsonString}`);

      try {
        geminiResponse = JSON.parse(jsonString);
      } catch (parseError) {
        this.logger.error(`JSON parsing error: ${parseError.message}`);
        this.logger.error(`Failed to parse JSON string: ${jsonString}`);
        throw new Error('Gemini 응답을 JSON으로 파싱할 수 없습니다.');
      }

      if (!geminiResponse?.recommendation_options || !Array.isArray(geminiResponse.recommendation_options)) {
        this.logger.error(`Invalid response structure: ${JSON.stringify(geminiResponse)}`);
        throw new Error('Gemini 응답 형식이 예상과 다릅니다: recommendation_options가 없습니다.');
      }
    } catch (error) {
      this.logger.error(`Gemini API call or parsing error: ${error.message}`);
      return {
        weather: weather,
        recommendations: [],
        geminiResponse: {
          recommendation_options: [],
        },
      };
    }

    // 4. Gemini가 추천한 태그 조합 → 음식점/메뉴 매칭 (기존 코드 그대로)
    const { entities: allRestaurants } = await this.restaurantService.findNearby(lat, lon, 10000);

    // [중간 결과: 메뉴 단위로 모으기]
    const menuLevelRecommendations = [];
  
    for (const geminiOption of geminiResponse.recommendation_options) {
      const recommendedTags = geminiOption.recommended_tags;
      const recommendationReason = geminiOption.recommendation_reason;
  
      for (const restaurant of allRestaurants) {
        if (!restaurant.menu_tags) continue;
  
        let parsedRestaurantData: any;
        try {
          parsedRestaurantData =
            typeof restaurant.menu_tags === 'string'
              ? JSON.parse(restaurant.menu_tags)
              : restaurant.menu_tags;
        } catch (e) {
          this.logger.error(
            `Error parsing menu_tags for restaurant ${restaurant.id}: ${e.message}`,
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
  
        let restaurantPhoto = restaurant['photo'];
        if (typeof restaurantPhoto === 'string') {
          try {
            const arr = JSON.parse(restaurantPhoto);
            if (Array.isArray(arr)) restaurantPhoto = arr[0];
          } catch {}
        } else if (Array.isArray(restaurantPhoto)) {
          restaurantPhoto = restaurantPhoto[0];
        }
  
        const ESSENTIAL_TAGS = ["음식카테고리", "조리방식"];
        const MIN_MATCH_RATIO = 0.6;
  
        for (const [menuName, menuTags] of Object.entries(actualMenuTagsObj)) {
          let matchedCategoryCount = 0;
          let totalCategoryCount = 0;
          let isEssentialMismatch = false;
  
          for (const tagCategory in recommendedTags) {
            totalCategoryCount++;
            const requiredTags = recommendedTags[tagCategory];
            const actualMenuCategoryTags = (menuTags as any)[tagCategory];
            const isEssential = ESSENTIAL_TAGS.includes(tagCategory);
  
            if (!actualMenuCategoryTags || !Array.isArray(actualMenuCategoryTags)) {
              if (isEssential) isEssentialMismatch = true;
              continue;
            }
  
            const hasMatchingTag = requiredTags.some((requiredTag) =>
              actualMenuCategoryTags.includes(requiredTag),
            );
  
            if (hasMatchingTag) {
              matchedCategoryCount++;
            } else {
              if (isEssential) isEssentialMismatch = true;
            }
          }
  
          if (isEssentialMismatch) continue;
          const matchRatio = totalCategoryCount > 0 ? matchedCategoryCount / totalCategoryCount : 0;
  
          if (matchRatio >= MIN_MATCH_RATIO) {
            let specificMenuImageUrl: string | null = null;
            try {
              const menuDetails = JSON.parse(restaurant.menu);
              if (Array.isArray(menuDetails)) {
                const matchedMenuItem = menuDetails.find(
                  (item: any) => item.name === menuName,
                );
                if (matchedMenuItem?.images?.[0]) {
                  specificMenuImageUrl = matchedMenuItem.images[0];
                }
              }
            } catch {}
  
            // ⭐️ 룰기반과 동일한 구조로 추가!
            menuLevelRecommendations.push({
              restaurant_id: restaurant.id,
              restaurant_name: restaurant['사업장명'],
              restaurant_image_url: restaurantPhoto || null,
              menu: menuName,
              menu_image_url: specificMenuImageUrl,
              matched_rules: ["LLM_응용_추천"],
              descriptions: [recommendationReason],
              matched_tags: [recommendedTags],
              applied_rules_details: [
                {
                  name: "LLM_응용_추천",
                  description: recommendationReason,
                  weather_condition: {},
                  meal_time_condition: [],
                  menu_tags_condition: recommendedTags,
                },
              ],
            });
          }
        }
      }
    }
  
    // === [★ 중요: restaurant_id, restaurant_name, ...별로 그룹화!] ===
    const groupedRecommendations = menuLevelRecommendations.reduce((acc, curr) => {
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
  
    // (shuffling/슬라이싱 등 필요에 따라)
    const shuffled = groupedRecommendations.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 25);
  
    // ⭐️ 룰 기반 API와 완전히 동일 포맷 반환!
    return {
      weather,
      recommendations: selected,
    };
  }
}  