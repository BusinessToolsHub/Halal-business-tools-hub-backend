// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const evaluateRoute = require("./routes/evaluate");
app.use("/api/evaluate-investment", evaluateRoute);
const fxRoute = require('./routes/fxRates');
app.use('/api/metal-rates', fxRoute);
// in server.js

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
