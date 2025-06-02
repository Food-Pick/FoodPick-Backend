import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  // 기상청 공식 격자 좌표 변환 함수
  private convertToGrid(lat: number, lon: number) {
    const RE = 6371.00877;
    const GRID = 5.0;
    const SLAT1 = 30.0;
    const SLAT2 = 60.0;
    const OLON = 126.0;
    const OLAT = 38.0;
    const XO = 43;
    const YO = 136;
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

  // base_date, base_time을 한 번에 산출 (한국 기상청 표준)
  private getKMAStandardDateTime() {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    let year = kst.getFullYear();
    let month = String(kst.getMonth() + 1).padStart(2, '0');
    let day = String(kst.getDate()).padStart(2, '0');
    let hour = kst.getHours();
    const minute = kst.getMinutes();

    if (minute < 40) {
      hour -= 1;
      if (hour < 0) {
        const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
        year = prev.getFullYear();
        month = String(prev.getMonth() + 1).padStart(2, '0');
        day = String(prev.getDate()).padStart(2, '0');
        hour = 23;
      }
    }
    return {
      base_date: `${year}${month}${day}`,
      base_time: `${String(hour).padStart(2, '0')}00`,
    };
  }

  // 지수 백오프 딜레이용
  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getCurrentWeather(lat: number, lon: number) {
    const grid = this.convertToGrid(lat, lon);
    const { base_date, base_time } = this.getKMAStandardDateTime();

    const params = new URLSearchParams({
      serviceKey: process.env.WEATHER_API_KEY,
      pageNo: '1',
      numOfRows: '1000',
      dataType: 'JSON',
      base_date,
      base_time,
      nx: grid.x.toString(),
      ny: grid.y.toString(),
    });

    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${params}`;

    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          this.logger.warn(
            `[WeatherService] API 재시도: ${attempt}회차, ${Math.pow(2, attempt - 1)}초 대기`,
          );
          await this.delay(1000 * Math.pow(2, attempt - 1)); // 1, 2, 4초
        }
        const response = await fetch(url);

        if (!response.ok) {
          const text = await response.text();
          this.logger.error(`Weather API Error: ${text}`);
          lastError = new Error('날씨 정보를 가져오는데 실패했습니다.');
          attempt++;
          continue;
        }

        const data = await response.json();

        if (!data.response?.body?.items?.item) {
          this.logger.error('Invalid weather data format:', data);
          lastError = new Error('날씨 데이터 형식이 올바르지 않습니다.');
          attempt++;
          continue;
        }

        return this.parseWeatherData(data);
      } catch (error) {
        this.logger.error('Weather API Error:', error);
        lastError = error;
        attempt++;
        // 계속 재시도
      }
    }

    // 최대 시도 이후에도 실패하면 예외 발생
    throw lastError ?? new Error('날씨 정보를 가져오는데 실패했습니다.');
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

    Logger.log(weatherInfo);
    return weatherInfo;
  }
}
