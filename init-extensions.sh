#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 확장 설치
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS system_stats;
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    CREATE EXTENSION IF NOT EXISTS pgroonga;

    -- geometry 컬럼 생성
    ALTER TABLE restaurant_merged ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

    -- 위도경도 → geom 업데이트
    UPDATE restaurant_merged
    SET geom = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

    -- 공간 인덱스
    CREATE INDEX IF NOT EXISTS idx_geom ON restaurant_merged USING GIST (geom);

    -- pgroonga 인덱스 (1~2글자 한글 검색 대응)
    CREATE INDEX IF NOT EXISTS idx_menu_pgroonga ON restaurant_merged USING pgroonga (menu);
EOSQL 0