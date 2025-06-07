FROM node:20-alpine

WORKDIR /usr/src/app

# bcrypt 빌드 의존성 설치
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# 의존성 설치 및 NestJS CLI 전역 설치
RUN npm install
RUN npm install -g @nestjs/cli
RUN npm install -g typescript

# TypeScript 타입 정의 설치
RUN npm install --save-dev @types/node

COPY . .

# TypeScript 컴파일
RUN npm run build

# entrypoint.sh 복사 및 실행 권한 부여
COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "npm run start:dev"]