#!/bin/sh

# NestJS CLI가 없으면 설치
if ! command -v nest > /dev/null; then
  npm install -g @nestjs/cli
fi

# package.json이 없으면 프로젝트 자동 생성
if [ ! -f ./src/main.ts ] && [ ! -f ./package.json ]; then
  echo "NestJS 프로젝트가 없으므로 자동 생성합니다..."
  npx @nestjs/cli new . --package-manager npm
fi

npm install
npm run start:dev