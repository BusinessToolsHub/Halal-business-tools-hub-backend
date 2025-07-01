// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Log initial connection
pool.query('SELECT NOW()')
  .then(res => console.log('✅ DB connected. Time:', res.rows[0]))
  .catch(err => console.error('❌ DB connection failed:', err.message));

// ✅ Graceful error handler
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
  // Optionally restart app logic here (if using PM2 or nodemon it'll auto-restart)
});

// ✅ 🔁 Keep pool alive (Supabase kills idle clients)
setInterval(async () => {
  try {
    await pool.query('SELECT 1'); // Very lightweight
    console.log('🔄 Pool keep-alive ping at', new Date().toISOString());
  } catch (err) {
    console.error('❌ Pool ping failed:', err.message);
  }
}, 30000); // 30 seconds

module.exports = pool;
