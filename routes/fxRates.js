const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
require('dotenv').config();
// Constants
const API_KEY = process.env.METALPRICE_API_KEY;
const METALPRICE_API = `https://api.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=PKR&currencies=XAU,XAG`;

const OUNCE_TO_GRAM = 31.1035;

// In-memory cache
let cachedRates = {
  gold: "29888.79",         // PKR per gram (default approx)
  silver: "328.47",         // PKR per gram (default approx)
  usdToPkr: 278.60,
  timestamp: new Date().toISOString(),
  fallback: true,
  message: "⚠️ Using manually cached rates due to API limit or fetch failure"
};

// Fetch and cache metal rates in PKR
const updateMetalRates = async () => {
  try {
    const { data } = await axios.get(ENDPOINT, {
      params: {
        api_key: API_KEY,
        base: 'PKR',
        currencies: 'XAU,XAG'
      },
      timeout: 10000 // 10 seconds
    });

    console.log("🔍 Full MetalpriceAPI response:", data);

    const goldPerOunce = data?.rates?.PKRXAU;
    const silverPerOunce = data?.rates?.PKRXAG;

    if (!goldPerOunce || !silverPerOunce) throw new Error("Missing metal rates");

    const gold = (goldPerOunce / 31.1035).toFixed(2);
    const silver = (silverPerOunce / 31.1035).toFixed(2);

    cachedRates = {
      gold,
      silver,
      timestamp: new Date().toISOString(),
      fallback: false,
      message: "✅ Live data updated "
    };

    console.log("✅ Metal rates updated:", cachedRates);
  } catch (error) {
    console.error("⚠️ Error fetching metal prices. Using cached rates.\n", error.message);
  }
};


// Schedule rate update twice a day: every 12 hours
setInterval(updateMetalRates, 12 * 60 * 60 * 1000); // 12 hours in ms

// Also fetch once when server starts
updateMetalRates();

// API endpoint (serve only cached data)
router.get('/', (req, res) => {
  res.json(cachedRates);
});

module.exports = router;
