import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  // 기상청 공식 격자 좌표 변환 함수
  private convertToGrid(lat: number, lon: number) {
    const RE = 6371.00877; // 지구 반경(km)
    const GRID = 5.0; // 격자 간격(km)
    const SLAT1 = 30.0; // 투영 위도1(degree)
    const SLAT2 = 60.0; // 투영 위도2(degree)
    const OLON = 126.0; // 기준점 경도(degree)
    const OLAT = 38.0; // 기준점 위도(degree)
    const XO = 43; // 기준점 X좌표(GRID)
    const YO = 136; // 기준점 Y좌표(GRID)
    const DEGRAD = Math.PI / 180.0;

    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn =
      Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
      Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);

    const rs: any = {};
    const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
    const ra2 = (re * sf) / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    rs.x = Math.floor(ra2 * Math.sin(theta) + XO + 0.5);
    rs.y = Math.floor(ro - ra2 * Math.cos(theta) + YO + 0.5);

    return rs;
  }

  async getCurrentWeather(lat: number, lon: number) {
    try {
      const grid = this.convertToGrid(lat, lon);

      const params = new URLSearchParams({
        serviceKey: process.env.WEATHER_API_KEY,
        pageNo: '1',
        numOfRows: '1000',
        dataType: 'JSON',
        base_date: this.getBaseDate(),
        base_time: this.getBaseTime(),
        nx: grid.x.toString(),
        ny: grid.y.toString(),
      });

      const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${params}`;
      console.log(url);
      const response = await fetch(url);

      //   console.log(response);

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Weather API Error: ${text}`);
        throw new Error('날씨 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();

      if (!data.response?.body?.items?.item) {
        this.logger.error('Invalid weather data format:', data);
        throw new Error('날씨 데이터 형식이 올바르지 않습니다.');
      }

      return this.parseWeatherData(data);
    } catch (error) {
      this.logger.error('Weather API Error:', error);
      throw new Error('날씨 정보를 가져오는데 실패했습니다.');
    }
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

  private getBaseDate(): string {
    const now = new Date();
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const minutes = kstDate.getMinutes();

    // 40분 이전이면 이전 시각 데이터 사용
    if (minutes < 40) {
      kstDate.setHours(kstDate.getHours() - 1);
      // 시간이 23시로 돌아갔을 때 이전 날짜로 처리
      if (kstDate.getHours() === 23) {
        kstDate.setDate(kstDate.getDate() - 1);
      }
    }

    const year = kstDate.getFullYear();
    const month = String(kstDate.getMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private getBaseTime(): string {
    const now = new Date();
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    let hour = kstDate.getHours();
    const minutes = kstDate.getMinutes();

    // 40분 이전이면 이전 시각 데이터 사용
    if (minutes < 40) {
      hour -= 1;
      if (hour < 0) hour = 23;
    }
    return `${String(hour).padStart(2, '0')}00`;
  }

  private parseWeatherData(data: any) {
    const items = data.response.body.items.item;

    const weatherInfo: any = {
      temperature: null, // T1H
      precipitation: null, // RN1
      precipitationType: null, // PTY
      humidity: null, // REH
      sky: null, // SKY
      windSpeed: null, // WSD
      windDirection: null, // VEC
      eastWestWind: null, // UUU
      northSouthWind: null, // VVV
    };

    items.forEach((item: any) => {
      switch (item.category) {
        case 'T1H': // 기온
          weatherInfo.temperature = item.obsrValue;
          break;
        case 'RN1': // 1시간 강수량
          weatherInfo.precipitation = item.obsrValue;
          break;
        case 'PTY': // 강수형태
          weatherInfo.precipitationType = item.obsrValue;
          break;
        case 'REH': // 습도
          weatherInfo.humidity = item.obsrValue;
          break;
        case 'SKY': // 하늘상태
          weatherInfo.sky = item.obsrValue;
          break;
        case 'WSD': // 풍속
          weatherInfo.windSpeed = item.obsrValue;
          break;
        case 'VEC': // 풍향
          weatherInfo.windDirection = item.obsrValue;
          break;
        case 'UUU': // 동서바람성분
          weatherInfo.eastWestWind = item.obsrValue;
          break;
        case 'VVV': // 남북바람성분
          weatherInfo.northSouthWind = item.obsrValue;
          break;
      }
    });

    return weatherInfo;
  }
}
