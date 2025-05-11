#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 확장 설치
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

    -- 테이블 예시 (이미 있다면 생략)
    -- CREATE TABLE IF NOT EXISTS restaurant_merged (...);

    -- geometry 컬럼 생성
    ALTER TABLE restaurant_merged ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

    -- 위도경도 → geom 업데이트
    UPDATE restaurant_merged
    SET geom = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

    -- 인덱스 생성
    CREATE INDEX IF NOT EXISTS idx_geom ON restaurant_merged USING GIST (geom);
EOSQL 