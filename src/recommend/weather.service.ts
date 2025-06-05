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

    // 초단기실황 API 요청
    const ncstParams = new URLSearchParams({
      serviceKey: process.env.WEATHER_API_KEY,
      pageNo: '1',
      numOfRows: '1000',
      dataType: 'JSON',
      base_date,
      base_time,
      nx: grid.x.toString(),
      ny: grid.y.toString(),
    });

    const ncstUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${ncstParams}`;

    // 초단기예보 API 요청
    const fcstParams = new URLSearchParams({
      serviceKey: process.env.WEATHER_API_KEY,
      pageNo: '1',
      numOfRows: '1000',
      dataType: 'JSON',
      base_date,
      base_time,
      nx: grid.x.toString(),
      ny: grid.y.toString(),
    });

    const fcstUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?${fcstParams}`;

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

        // 두 API를 병렬로 요청
        const [ncstResponse, fcstResponse] = await Promise.all([
          fetch(ncstUrl),
          fetch(fcstUrl),
        ]);

        // 초단기실황 데이터 처리
        const ncstText = await ncstResponse.text();
        if (
          ncstText.trim().startsWith('<!DOCTYPE') ||
          ncstText.trim().startsWith('<')
        ) {
          this.logger.error(
            'Weather API returned HTML instead of JSON:',
            ncstText.substring(0, 200),
          );
          lastError = new Error('날씨 API가 HTML을 반환했습니다.');
          attempt++;
          continue;
        }

        // 초단기예보 데이터 처리
        const fcstText = await fcstResponse.text();
        if (
          fcstText.trim().startsWith('<!DOCTYPE') ||
          fcstText.trim().startsWith('<')
        ) {
          this.logger.error(
            'Weather API returned HTML instead of JSON:',
            fcstText.substring(0, 200),
          );
          lastError = new Error('날씨 API가 HTML을 반환했습니다.');
          attempt++;
          continue;
        }

        // JSON 파싱 시도
        let ncstData, fcstData;
        try {
          ncstData = JSON.parse(ncstText);
          fcstData = JSON.parse(fcstText);
        } catch (parseError) {
          this.logger.error('Weather API response parsing error:', parseError);
          lastError = new Error('날씨 데이터 파싱에 실패했습니다.');
          attempt++;
          continue;
        }

        if (!ncstResponse.ok || !fcstResponse.ok) {
          this.logger.error(
            `Weather API Error: ${JSON.stringify(ncstData)} ${JSON.stringify(fcstData)}`,
          );
          lastError = new Error('날씨 정보를 가져오는데 실패했습니다.');
          attempt++;
          continue;
        }

        if (
          !ncstData.response?.body?.items?.item ||
          !fcstData.response?.body?.items?.item
        ) {
          this.logger.error('Invalid weather data format:', {
            ncstData,
            fcstData,
          });
          lastError = new Error('날씨 데이터 형식이 올바르지 않습니다.');
          attempt++;
          continue;
        }

        return this.parseWeatherData(ncstData, fcstData);
      } catch (error) {
        this.logger.error('Weather API Error:', error);
        lastError = error;
        attempt++;
      }
    }

    // 최대 시도 이후에도 실패하면 예외 발생
    throw lastError ?? new Error('날씨 정보를 가져오는데 실패했습니다.');
  }

  private parseWeatherData(ncstData: any, fcstData: any) {
    const ncstItems = ncstData.response.body.items.item;
    const fcstItems = fcstData.response.body.items.item;

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
      pcpLevel: null, // PCP
      pcpDesc: null, // PCP_DESC
      snoLevel: null, // SNO
      snoDesc: null, // SNO_DESC
      wsdLevel: null, // WSD
      wsdDesc: null, // WSD_DESC
    };

    // 초단기실황 데이터 파싱
    ncstItems.forEach((item: any) => {
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

    // 초단기예보 데이터에서 하늘상태(SKY) 파싱
    const skyItems = fcstItems.filter((item: any) => item.category === 'SKY');
    if (skyItems.length > 0) {
      // 현재 시간에 가장 가까운 예보 데이터 찾기
      const now = new Date();
      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const currentHour = kst.getHours();

      // 가장 가까운 시간의 예보 찾기
      const closestSkyItem = skyItems.reduce((closest: any, current: any) => {
        const forecastHour = parseInt(current.fcstTime.substring(0, 2));
        const currentDiff = Math.abs(forecastHour - currentHour);
        const closestDiff = Math.abs(
          parseInt(closest.fcstTime.substring(0, 2)) - currentHour,
        );

        // 현재 시간이 예보 시간보다 이전이면 무시
        if (forecastHour < currentHour) return closest;

        return currentDiff < closestDiff ? current : closest;
      });

      weatherInfo.sky = closestSkyItem.fcstValue;
    }

    // 초단기예보 데이터에서 정성정보 파싱
    // 강수량(PCP)
    const pcpItem = fcstItems.find((item: any) => item.category === 'PCP');
    if (pcpItem) {
      weatherInfo.pcpLevel = pcpItem.fcstValue;
      switch (pcpItem.fcstValue) {
        case '1':
          weatherInfo.pcpDesc = '약한 비';
          break;
        case '2':
          weatherInfo.pcpDesc = '보통 비';
          break;
        case '3':
          weatherInfo.pcpDesc = '강한 비';
          break;
        default:
          weatherInfo.pcpDesc = undefined;
      }
    }
    // 눈의양(SNO)
    const snoItem = fcstItems.find((item: any) => item.category === 'SNO');
    if (snoItem) {
      weatherInfo.snoLevel = snoItem.fcstValue;
      switch (snoItem.fcstValue) {
        case '1':
          weatherInfo.snoDesc = '보통 눈';
          break;
        case '2':
          weatherInfo.snoDesc = '많은 눈';
          break;
        default:
          weatherInfo.snoDesc = undefined;
      }
    }
    // 풍속(WSD)
    const wsdItem = fcstItems.find((item: any) => item.category === 'WSD');
    if (wsdItem) {
      weatherInfo.wsdLevel = wsdItem.fcstValue;
      switch (wsdItem.fcstValue) {
        case '1':
          weatherInfo.wsdDesc = '약한 바람';
          break;
        case '2':
          weatherInfo.wsdDesc = '약간 강한 바람';
          break;
        case '3':
          weatherInfo.wsdDesc = '강한 바람';
          break;
        default:
          weatherInfo.wsdDesc = undefined;
      }
    }

    Logger.log(weatherInfo);
    return weatherInfo;
  }
}
