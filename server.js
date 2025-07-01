// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require('./db'); 
const contractsRoute = require('./routes/contracts');
const evaluateRoute = require("./routes/evaluate");
const fxRoute = require('./routes/fxRates');


dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/evaluate-investment", evaluateRoute);
app.use('/api/metal-rates', fxRoute);
app.use('/api/contracts', contractsRoute);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

