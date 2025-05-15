#!/bin/sh

# NestJS CLI가 없으면 설치
if ! command -v nest > /dev/null;
then
  npm install -g @nestjs/cli
fi

# package.json이 없으면 프로젝트 자동 생성
if [ ! -f ./src/main.ts ] && [ ! -f ./package.json ]; 
then
  echo "NestJS 프로젝트가 없으므로 자동 생성합니다..."
  npx @nestjs/cli new . --package-manager npm
fi

# 의존성 설치
npm install

# 최적화된 개발 서버 시작
export NODE_OPTIONS="--max-old-space-size=2048 --max_semi_space_size=64"
exec npm run start:dev -- --preserveWatchOutput