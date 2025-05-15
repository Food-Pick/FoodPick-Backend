FROM node:18-alpine

WORKDIR /usr/src/app

COPY . .

# entrypoint.sh 복사 및 실행 권한 부여
COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "npm run start:dev"]