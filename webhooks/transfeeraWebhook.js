const Transaction = require('../models/transaction');
const WalletService = require('../services/walletService');
const TransfeeraPIX  = require('../services/transfeeraService').TransfeeraPIX;

class TransfeerWebhookHandler{
     constructor() {
        this.walletService = new WalletService();
        this.transfeera = new TransfeeraPIX({
        clientId: process.env.TRANSFEERA_CLIENT_ID,
        clientSecret: process.env.TRANSFEERA_CLIENT_SECRET,
        pixKey: process.env.TRANSFEERA_PIX_KEY,
        authToken: process.env.TRANSFEERA_AUTH_TOKEN,
        sandbox: process.env.NODE_ENV !== 'production'
        });
  }

  async handleWebhook(req, res) {
    try {
      const signature = req.headers['x-signature'];
      const payload = req.body;
      const webhookSecret = process.env.TRANSFEERA_WEBHOOK_SECRET;

      // Validate webhook signature
      if (!this.transfeera.validateWebhookSignature(payload, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = JSON.parse(payload);
      console.log('Received webhook event:', event.type, event.data);

      // Handle different event types
      switch (event.type) {
        case 'charge.paid':
          await this.handleChargePaid(event.data);
          break;
        
        case 'charge.expired':
          await this.handleChargeExpired(event.data);
          break;
        
        case 'payment.completed':
          await this.handlePaymentCompleted(event.data);
          break;
        
        case 'payment.failed':
          await this.handlePaymentFailed(event.data);
          break;
        
        default:
          console.log('Unknown event type:', event.type);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleChargePaid(data) {
    try {
      const transaction = await Transaction.findOne({
        pixChargeId: data.id,
        type: 'DEPOSIT',
        status: 'PENDING'
      });

      if (transaction) {
        // Process the deposit
        await this.walletService.processDepositSuccess(
          data.id,
          TransfeeraPIX.formatAmountFromCents(data.amount)
        );
        console.log('Deposit processed successfully:', data.id);
      }
    } catch (error) {
      console.error('Error handling charge paid:', error);
    }
  }

  async handleChargeExpired(data) {
    try {
      const transaction = await Transaction.findOne({
        pixChargeId: data.id,
        type: 'DEPOSIT',
        status: 'PENDING'
      });

      if (transaction) {
        transaction.status = 'CANCELLED';
        await transaction.save();
        console.log('Deposit charge expired:', data.id);
      }
    } catch (error) {
      console.error('Error handling charge expired:', error);
    }
  }

  async handlePaymentCompleted(data) {
    try {
      const transaction = await Transaction.findOne({
        pixPaymentId: data.id,
        status: 'PENDING'
      });

      if (transaction) {
        transaction.status = 'COMPLETED';
        transaction.completedAt = new Date();
        await transaction.save();
        console.log('Payment completed:', data.id);
      }
    } catch (error) {
      console.error('Error handling payment completed:', error);
    }
  }

  async handlePaymentFailed(data) {
    try {
      const transaction = await Transaction.findOne({
        pixPaymentId: data.id,
        status: 'PENDING'
      });

      if (transaction) {
        transaction.status = 'FAILED';
        await transaction.save();
        console.log('Payment failed:', data.id);
        
        // Handle failed payment based on transaction type
        if (transaction.type === 'CAMPAIGN_PAYMENT') {
          // Handle failed campaign payment
          console.log('Campaign payment failed, may need manual intervention');
        } else if (transaction.type === 'CAMPAIGN_REFUND') {
          // Handle failed refund
          console.log('Campaign refund failed, may need manual intervention');
        }
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

}

module.exports = TransfeerWebhookHandler