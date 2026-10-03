-- 001_init_postgis.sql
-- Enable PostGIS extension for spatial queries and geometry types

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify PostGIS installation
SELECT PostGIS_Full_Version();
