import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export let pool = null;
export let isPostgresConnected = false;

export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('ℹ️ No DATABASE_URL provided. Running backend in In-Memory / Standalone PostGIS-Emulation mode.');
    return false;
  }

  try {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 3000,
    });

    const client = await pool.connect();
    const res = await client.query('SELECT version();');
    console.log('✅ Connected to PostgreSQL:', res.rows[0].version);
    
    // Check PostGIS
    try {
      const gisRes = await client.query('SELECT PostGIS_Version();');
      console.log('✅ PostGIS Extension active:', gisRes.rows[0].postgis_version);
    } catch (gisErr) {
      console.warn('⚠️ PostGIS not enabled in database. Spatial queries will use fallback emulation.');
    }
    
    client.release();
    isPostgresConnected = true;
    return true;
  } catch (err) {
    console.warn(`⚠️ Could not connect to PostgreSQL (${err.message}). Using In-Memory Mock Store with full PostGIS geometry emulation.`);
    isPostgresConnected = false;
    pool = null;
    return false;
  }
}
