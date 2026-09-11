-- ====================================================================
-- CampusFix AI — Milestone M6 PostGIS Spatial DDL & GiST Indexing
-- ====================================================================

-- 1. Enable PostGIS extension (in extensions or public schema)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. Add geography(Point, 4326) column to locations table
ALTER TABLE public.locations 
    ADD COLUMN IF NOT EXISTS geom extensions.geography(Point, 4326);

-- Update geom values from latitude/longitude
UPDATE public.locations
SET geom = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography
WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Create High-Performance GiST Spatial Index
CREATE INDEX IF NOT EXISTS idx_locations_gist_geom 
    ON public.locations USING GIST (geom);

-- 4. Create Composite Spatial & Tenant Index
CREATE INDEX IF NOT EXISTS idx_locations_tenant_gist 
    ON public.locations (university_id) INCLUDE (latitude, longitude);

-- 5. PostGIS Distance Function Query Template
-- SELECT id, building_name, 
--        extensions.ST_Distance(geom, extensions.ST_SetSRID(extensions.ST_MakePoint(:lon, :lat), 4326)::extensions.geography) as distance_meters
-- FROM public.locations
-- WHERE university_id = :university_id
--   AND extensions.ST_DWithin(geom, extensions.ST_SetSRID(extensions.ST_MakePoint(:lon, :lat), 4326)::extensions.geography, :radius_meters);
