// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// const pool = require('./db'); 
const contractsRoute = require('./routes/contracts');
const evaluateRoute = require("./routes/evaluate");
const fxRoute = require('./routes/fxRates');
const authRoutes = require('./routes/auth');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/evaluate-investment", evaluateRoute);
app.use('/api/metal-rates', fxRoute);
app.use('/api/contracts', contractsRoute);
app.use('/api/auth', authRoutes);


app.get('/ping', (req, res) => {
  console.log('Ping received at', new Date().toISOString());
  res.status(200).send('pong');
});
app.get('/', (req, res) => {
  res.status(200).send('Halal Business Tools Hub backend is live 🚀');
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

