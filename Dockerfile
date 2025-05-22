FROM node:18-alpine

WORKDIR /usr/src/app

# bcrypt 빌드 의존성 설치
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# 의존성 설치
RUN npm install

COPY . .

# entrypoint.sh 복사 및 실행 권한 부여
COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "npm run start:dev"]