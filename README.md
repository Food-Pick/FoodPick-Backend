# FoodPick-Backend

NestJS와 PostgreSQL 기반의 FoodPick 웹 서비스 백엔드입니다.  
Docker를 이용해 개발 환경을 쉽고 빠르게 구축할 수 있습니다.

---

## 🚀 빠른 시작

### 1. 필수 조건
- Docker, Docker Compose 설치 필요
- (권장) WSL2 환경에서 개발 시 파일 변경 감지 및 속도가 더 빠릅니다

### 2. 컨테이너 실행

```bash
docker compose up --build
```

- NestJS API: [http://localhost:2100](http://localhost:2100)
- PostgreSQL: localhost:5000 (로컬에서 직접 접속 시)

### 3. 컨테이너 종료

```bash
docker compose down
```

---

## ⚙️ 서비스 구성

| 서비스명   | 설명                | 포트 매핑         |
|------------|---------------------|-------------------|
| api        | NestJS 백엔드 서버  | 2100 (호스트) → 3000 (컨테이너) |
| postgres   | PostgreSQL 데이터베이스 | 5000 (호스트) → 5432 (컨테이너) |

---

## 🗄️ 데이터베이스 정보

- **host**: `postgres` (컨테이너 내부) / `localhost` (로컬에서 직접 접속 시)
- **port**: `5432` (컨테이너 내부) / `5000` (로컬)
- **user**: `foodpick`
- **password**: `foodpick123`
- **database**: `foodpick`

예시 `.env`:
```
DATABASE_URL=postgresql://foodpick:foodpick123@postgres:5432/foodpick
```

---

## 🔥 개발 환경 특징

- 소스코드 변경 시 자동으로 서버가 리로드됩니다 (Hot Reload)
- 모든 개발 의존성은 도커 컨테이너 내부에서 관리됩니다
- 볼륨 마운트로 로컬 소스코드와 컨테이너가 동기화됩니다
- NestJS 프로젝트가 없으면 컨테이너가 자동으로 생성합니다

---

## 📝 기타

- WSL2 환경에서 개발 시 성능이 더 좋습니다.
- 문의 및 기여는 언제든 환영합니다!

