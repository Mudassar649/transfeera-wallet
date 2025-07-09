const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const walletRoutes = require('./routes/walletRoutes');
const campaignRoutes = require('./routes/campaigRoutes');
const TransfeerWebhookHandler = require('./webhooks/transfeeraWebhook');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/campaign', campaignRoutes);

// Webhook handler
const webhookHandler = new TransfeerWebhookHandler();
app.use('/webhook/transfeera', express.raw({ type: 'application/json' }));
app.post('/webhook/transfeera', webhookHandler.handleWebhook.bind(webhookHandler));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;