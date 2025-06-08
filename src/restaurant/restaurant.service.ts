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


const NAVER_CATEGORY_KEYWORD_MAP = {
    korean: ["123막창", "135튀김집", "24시뼈다귀탕", "24시전주콩나물국밥", "2대맛태", "33떡볶이", "3일국밥", "45년의정부부대찌개", "88콩나물국밥", "BS치킨", "DDC치킨", "JVL부대찌개", "가리미김밥", "가야밀면", "가연장", "갈매기먹짱", "갈비배달도시락스트릿테이블", "감성낙곱새", "감성족발", "감자탕", "강가네손만두", "강화통통생고기", "개성진찹쌀순대", "거궁", "건어물", "고고즉석떡볶이", "고기바보", "고기뷔페", "고기원칙", "고기요리", "곱창,막창,양", "곰탕,설렁탕", "굴요리", "궁채", "국밥", "국수", "기사식당", "김밥", "낙지요리", "냉면", "달봉이치킨", "달볶이", "달빛감자", "달떡", "닭", "닭갈비", "닭발", "닭발먹은새우", "닭발싸롱", "닭볶음탕", "닭요리", "닭장수후라이드", "대구근대골목단팥빵", "대구불노리왕막창", "대구안지랑막창", "대구왕뽈찜", "대구형제막창", "돼지고기", "돼지고기구이", "두부요리", "떡,한과", "떡볶이", "라면", "마실", "만두", "만년닭강정", "매운탕", "매운탕,해물탕", "무영쌈밥정식", "문가네진국", "문래돼지불백", "문스갈비", "문어부인삼교비", "문수산상황삼계탕", "미가옥", "미인닭발", "미향해장국", "민비아구찜해물찜", "밀겨울", "밀크밥버거", "바담코다리", "바람부리명태찜", "바른생갈비", "바로그집", "반찬가게", "백반", "백반,가정식", "백숙,삼계탕", "보리밥", "복어요리", "북문로떡볶이", "불닭", "불타는여고24시떡볶이", "비빔밥", "사철,영양탕", "산너머남촌", "삼청동국수", "상무팥죽", "생선구이", "생선회", "샤브샤브", "소고기", "소고기구이", "순대", "순대,순댓국", "시골한우시골돼지", "시장통", "신가네매운떡볶이", "신가네정읍국밥", "신라해장국", "신복관", "신사골옛날감자탕", "신안왕소금구이", "신의주부대찌개", "신떡순신천할매떡볶이", "쌈밥", "씨앗호떡부산떡볶이", "아귀찜", "아귀찜,해물찜", "아몬드치킨", "아부찌부대찌개", "아우라치킨", "악녀떡볶이", "안경할머니곱창", "애솔촌돼지", "애플김밥", "야식", "양푼이막창", "오리요리", "오징어요리", "육류", "육류,고기요리", "음식점", "이북음식", "이십사절기", "일공공키친", "일도씨닭갈비", "일석삼조버섯매운탕", "일점사", "일품등심가", "일품순두부", "일품정", "일초닭발", "인정국물떡볶이", "자매떡볶이", "자연e김밥", "자연담은화로", "장금수부대찌개", "장금이감자탕", "장수남원추어탕", "장수본가해장국", "장수통닭", "전,빈대떡", "전복요리", "정육식당", "제사음식", "조개요리", "족발", "족발,보쌈", "족황상제", "좋구먼", "주먹밥", "주꾸미요리", "죽", "찐빵", "찜닭", "찌개,전골", "치킨", "치킨,닭강정", "칼국수", "칼국수,만두", "퓨전음식", "한솥", "한식", "한식뷔페", "한일관", "한정식", "해물,생선요리", "해물탕", "해우리", "해장국", "향토음식", "호떡", "화덕고깃간", "회관", "도시락,조리식품제조", "도시락,컵밥", "뷔페", "해산물뷔페", "스마일명품찹쌀꽈배기", "스마일찹쌀꽈배기"],
    chinese: ["딤섬,중식만두", "마라탕", "미친양꼬치", "양갈비", "양꼬치", "중식당"],
    japanese: ["게다", "돈가스", "아경면선", "오니기리", "오뎅,꼬치", "오므라이스", "우동,소바", "이자카야", "일식,초밥뷔페", "일식당", "일식튀김,꼬치", "일본식라면", "자쿠와", "초밥,롤"],
    western: ["72420", "바나나테이블", "바닷가재요리", "바베큐와춤을", "바른생활샌드위치", "베트남음식", "서오릉피자", "샌드위치", "스파게티,파스타전문", "스파게티스토리", "아시아음식", "아프리카음식", "양식", "이탈리아음식", "인도음식", "임실49피자", "킹크랩요리", "태국음식", "터키음식", "패밀리레스토랑", "프랑스음식", "피자", "햄버거", "후렌치후라이", "그리스음식", "대게요리", "독일음식", "멕시코,남미음식", "스테이크,립"],
    cafe: ["101커피컨테이너", "CGV팝콘팩토리", "갓식빵", "갤러리카페", "고양이카페", "과일", "과일,주스전문점", "꽈배기", "다방", "다이어트,샐러드", "도넛", "동물카페", "떡카페", "디저트", "라이브카페", "룸카페", "만화,도서", "만화방", "미스터쫀득이", "바나프레소", "바르바커피", "방탈출카페", "베이글", "베이커리", "보드카페", "복합문화공간", "북카페", "브런치", "브런치카페", "블루보틀", "빙수", "빵", "사주카페", "샐러드", "슬라임카페", "쌀똑핫도그", "아이스크림", "아프리카커피초콜릿", "애견카페", "와플", "음료", "제과,제빵", "차", "차,커피", "채식,샐러드뷔페", "초콜릿전문점", "카페", "카페,디저트", "카페일루이스", "커피", "커피번", "케이크전문", "크레페", "테마카페", "테이크아웃커피", "토스트", "플라워카페", "한방카페", "핫도그", "호두과자", "홍차전문점", "힐링카페", "커피가공,제조", "커피자판기"],
    pub: ["1도씨맥주", "39치킨호프", "뮌헨1589", "갈매기브루잉", "강남맥주", "단란주점", "맥주,호프", "미친노가리", "민속주점", "민혁이네외국포차", "바(BAR)", "술집", "심야오뎅", "와인", "요리주점", "유흥주점", "전통,민속주점", "포장마차", "주류", "주류제조"],
    etc: ["1차철강제조", "h-kitchen", "par3골프장", "PC방", "가구", "가구,인테리어", "가공식품", "가정,생활용품", "건강기능보조식품", "건강기능식품제조", "건강음료", "건축설계", "게스트하우스", "게이트나인", "게임", "경영컨설팅", "경주빵", "결혼정보회사", "고시원,고시텔", "고고켄터키", "골프연습장", "골프용품", "공방", "공연,연극시설", "공연기획사", "공연장", "공유누리 개방자원", "과자,사탕,초코렛", "과자류제조", "관광,일반호텔", "관광농원,팜스테이", "관광안내소", "관람,체험", "광고,마케팅", "광고대행", "구제의류", "국립병원", "귀금속,시계", "그로서란트", "급식", "기계,장비제조", "기업", "기업,빌딩", "기업연수원", "기타", "기타숙박업", "기타도로시설", "꽃집,꽃배달", "낚시", "낚시터", "납골당", "남성정장", "노래방", "노인복지", "농공시설", "농수산물", "농업", "담배제조", "당구장", "당구용품", "대체,보조의료", "댄스교육", "댄스스포츠", "도배공사", "도서,음반,문구", "도시,테마공원", "도자기", "도자기제조", "독립서점", "동물원", "등산,아웃도어", "등산용품", "떡류제조", "레저,여행용품", "레일바이크", "레포츠시설", "롤러,인라인스케이트장", "리본공예", "멀티방", "모델 에이전시", "모텔", "목공예품", "목욕,찜질", "목욕탕,사우나", "목재가구제조", "무도장,콜라텍", "무용,댄스", "문구,팬시용품", "문화,예술인", "문화시설", "문화원", "물류,유통", "미술,공예품", "미술관", "미술교육", "미용", "미용실", "민박", "민영주차장", "밀키트", "바둑,기원", "바리스타", "박물관", "반려견놀이터", "반려동물", "반려동물미용", "반려동물분양", "반려동물용품", "반려동물장례", "반려동물호텔", "방앗간", "배관,냉난방공사", "배달대행", "배드민턴장", "병원,의원", "병원부속시설", "보건소", "보세의류", "보험", "복권,로또", "볼링장", "부녀회", "부속건물", "부속시설", "블라인드,버티컬", "사진,스튜디오", "사회,복지", "사회복지단체", "산장", "산업용품", "서점", "서핑,윈드서핑", "섬유가공", "세차", "세탁", "셀프,대여스튜디오", "셀프빨래방", "셀프세차", "소프트웨어개발", "속눈썹증모,연장", "수공예액세서리", "수산물", "수산물가공,제조", "수상스포츠용품", "수영장", "수예,자수", "수족관", "수입식품", "수입의류", "슈퍼,마트", "스키,스노보드", "스킨스쿠버", "스포츠,오락", "스포츠시설", "스포츠의류", "스포츠토토", "식료품", "식료품가공기계제조", "식료품제조", "식품", "식품,영양", "식물원,수목원", "실내골프연습장", "실외골프연습장", "실용음악교육", "심리상담", "아쿠아리움", "안경원", "애견사료", "애견용품", "애견훈련", "앤틱가구", "야구연습장", "야구장", "양궁장", "양어,양식업", "여관", "여성단체", "여성의류", "여행사", "연구,연구소", "영어회화", "영화관", "예식장", "오락,레저용품", "오락실", "오락시설", "오토바이", "오토바이용품", "옥외,전시광고", "온천,스파", "요가,명상", "요리교육", "요양병원", "원예,화훼농원", "워터파크", "웨딩드레스,예복", "웨딩컨설팅,플래너", "유기농산물", "유리공예", "유원지", "유흥시설", "은제품전문", "음반,CD", "음반기획,제작", "음료제조", "음악교육", "의류,패션", "의류제작", "이불,담요", "이벤트,파티", "인터넷상거래", "인테리어디자인", "인테리어소품", "임대,대여", "임대업", "자전거", "자전거수리", "자활후견기관", "장난감", "장례", "장례식장", "장소대여", "장의사", "전기,압력밥솥", "전기업", "전망대", "전시,행사대행", "전시관", "전자담배", "전통문화", "전통숙소", "전통식품", "전문디자인", "제품디자인", "제조업", "조경", "조립식건축", "종합도소매", "종합병원", "종합분식", "종합생활용품", "종합수련원", "종합패션", "주말농장", "주방용품", "주택", "중고가구", "중고차", "지원,대행", "직업,기술교육", "직판장", "짚라인", "찜질방", "채소", "채소재배", "체험,홍보관", "체험마을", "체험여행", "청소", "청소년수련원", "청소년시설", "축구교실", "축산업", "축산업용품", "출장요리", "출판사", "캠핑,야영장", "캠핑용품", "퀵서비스", "클럽,동호회", "클럽하우스", "키즈카페,실내놀이터", "테마파크", "테니스용품", "특산물,관광민예품", "파크골프장", "판촉,기념품", "패션", "패션잡화", "펜션", "편의시설", "편의점", "폐백,이바지음식", "푸드코트", "푸드트럭", "프랜차이즈본사", "피부,체형관리", "필라테스", "한약국,한약방", "한의원", "한복대여", "헬스장", "협회,단체", "호스텔", "호텔", "호텔부속시설", "화장도구", "화장품,향수", "화장터", "화훼재배", "휴게소", "휴대폰", "휴양림,산림욕장", "개발,공급업", "갤러리,화랑", "곡물가공,제조", "교육원,교육센터", "생활형숙박시설", "서적출판", "수련원,연수원", "스터디카페", "악세사리제조", "오디오출판,원판녹음", "우유,유제품", "운세,사주", "육류가공,제조", "인근주민", "장어,먹장어요리", "젓갈", "정보,컨텐츠제작", "지역공동체", "지역명소", "지역복지센터", "차류가공,제조", "천연화장품", "천주교", "콘도,리조트", "콘도,리조트부속건물"]
};

type CategoryType = keyof typeof NAVER_CATEGORY_KEYWORD_MAP;

//type CategoryType = keyof typeof CATEGORY_MAPPING;

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(RestaurantMerged)
    private restaurantRepository: Repository<RestaurantMerged>,
  ) { }

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

    // 입력값 sanitization
    const sanitizedName = name.replace(/[^\w\s가-힣]/g, '').trim();
    if (!sanitizedName) {
      return [];
    }

    console.log('Search parameters:', {
      name: sanitizedName,
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
        'restaurant.photo',
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
      .andWhere('restaurant.menu &@~ :keyword', {
        keyword: sanitizedName,
      })
      .orderBy('dist', 'ASC')
      .limit(25)
      .cache(true)
      .getMany();

    console.log('Query result:', {
      resultCount: result.length,
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

    const restaurants = await this.restaurantRepository
      .createQueryBuilder('restaurant')
      .select([
        'restaurant.id',
        'restaurant.사업장명',
        'restaurant.네이버_음식점_카테고리',
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
      .limit(100)
      .cache(true)
      .getRawAndEntities();

    return restaurants;
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

  /**
 * @description 카테고리로 주변 음식점을 검색합니다.
 * 네이버_음식점_카테고리(jsonb) 컬럼과 제공된 키워드 목록을 비교하여 필터링합니다.
 */
  async searchByCategory(
    category: CategoryType,
    lat: number,
    lng: number,
    distance = 3000,
  ) {
    const degreeRadius = distance / 111000;
    const keywords = NAVER_CATEGORY_KEYWORD_MAP[category];

    if (!keywords || keywords.length === 0) {
      return { entities: [], raw: [] };
    }

    // [수정] 키워드 배열을 정규 표현식의 OR 패턴으로 변환합니다.
    // 예: ['한식', '치킨'] -> '한식|치킨'
    // 정규식 특수 문자를 이스케이프 처리하여 안전하게 만듭니다.
    const keywordRegex = keywords
      .map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // 정규식 특수 문자 이스케이프
      .join('|');

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
        'restaurant.네이버_음식점_카테고리'
      ])
      .addSelect(
        `ST_Distance(
                restaurant.geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            )`,
        'dist',
      )
      .where(
        `ST_DWithin(
                restaurant.geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :distance
            )
            -- [수정] 정규 표현식 연산자 '~'를 사용하여 text 컬럼을 검색합니다.
            AND "restaurant"."네이버_음식점_카테고리" ~ :keywordRegex
            AND "restaurant"."geom" && ST_Expand(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :degreeRadius)`,
        {
          lat,
          lng,
          distance,
          keywordRegex, // 생성된 정규식 패턴을 파라미터로 전달
          degreeRadius
        },
      )
      .orderBy('dist', 'ASC')
      .limit(50)
      .cache(true)
      .getRawAndEntities();

    return result;
  }
}