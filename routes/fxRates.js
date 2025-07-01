const express = require('express');
const axios = require('axios');
const pool = require('../db'); // PostgreSQL pool connection
require('dotenv').config();

const router = express.Router();

const API_KEY = process.env.METALPRICE_API_KEY;
const ENDPOINT = `https://api.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=PKR&currencies=XAU,XAG`;

const OUNCE_TO_GRAM = 31.1035;

// Fetch and store metal rates into Supabase
const updateMetalRates = async () => {
  try {
    const { data } = await axios.get(ENDPOINT, {
      timeout: 10000 // 10 seconds
    });

    console.log("🔍 Full MetalpriceAPI response:", data);

    const goldPerOunce = data?.rates?.PKRXAU;
    const silverPerOunce = data?.rates?.PKRXAG;

    if (!goldPerOunce || !silverPerOunce) throw new Error("Missing metal rates");

    const gold = (goldPerOunce / OUNCE_TO_GRAM).toFixed(2);
    const silver = (silverPerOunce / OUNCE_TO_GRAM).toFixed(2);

    // Save to DB
    await pool.query(
      `INSERT INTO metal_rates (gold, silver, is_fallback) VALUES ($1, $2, false)`,
      [gold, silver]
    );

    console.log("✅ Rates stored to DB:", { gold, silver });

  } catch (error) {
    console.warn("⚠️ API fetch failed. Using last known rates from DB. Error:", error.message);

    // On error, duplicate last row with fallback=true
    const { rows } = await pool.query(
      `SELECT gold, silver FROM metal_rates ORDER BY fetched_at DESC LIMIT 1`
    );

    if (rows.length) {
      const { gold, silver } = rows[0];
      await pool.query(
        `INSERT INTO metal_rates (gold, silver, is_fallback) VALUES ($1, $2, true)`,
        [gold, silver]
      );
      console.log("🟡 Fallback data re-inserted into DB.");
    } else {
      console.error("❌ No fallback data available in DB.");
    }
  }
};

// Call once when server starts
// updateMetalRates();

// Schedule every 12 hours
setInterval(updateMetalRates, 12 * 60 * 60 * 1000);

// Serve the latest rates from DB
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT gold, silver, fetched_at, is_fallback FROM metal_rates ORDER BY fetched_at DESC LIMIT 1`
    );

    if (!rows.length) {
      return res.status(500).json({
        message: "⚠️ No metal rates found in database"
      });
    }

    const latest = rows[0];
    res.json({
      gold: latest.gold,
      silver: latest.silver,
      timestamp: latest.fetched_at,
      fallback: latest.is_fallback,
      message: latest.is_fallback
        ? "⚠️ Using last known fallback data"
        : "✅ Live rates from MetalpriceAPI"
    });
  } catch (err) {
    console.error("❌ DB error fetching rates:", err.message);
    res.status(500).json({
      message: "❌ Server error fetching metal rates",
      error: err.message
    });
  }
});

module.exports = router;
