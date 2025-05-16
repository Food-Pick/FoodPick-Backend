-- 메뉴 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_restaurant_menu ON restaurant_merged USING gin (to_tsvector('korean', menu));

-- 공간 검색을 위한 인덱스 (이미 있다면 생략)
CREATE INDEX IF NOT EXISTS idx_restaurant_geom ON restaurant_merged USING gist (geom);

-- 복합 인덱스 (메뉴 + 위치)
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_geom ON restaurant_merged USING gist (geom, to_tsvector('korean', menu));

-- 통계 정보 업데이트
ANALYZE restaurant_merged; 