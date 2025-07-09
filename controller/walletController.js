const WalletService = require('../services/walletService');
const Advertiser = require('../models/advertiser');
const ContentCreator = require('../models/contentCreator');
const Admin = require('../models/Admin');

class WalletController{
    constructor(){
        this.WalletService = new WalletService();
    }

    // Register advertiser and create wallet
  async registerAdvertiser(req, res) {
    try {
      const { name, email, document, pixKey, company, phone } = req.body;

      // Create advertiser
      const advertiser = new Advertiser({
        name,
        email,
        document,
        pixKey,
        company,
        phone
      });

      await advertiser.save();

      // Create wallet
      const wallet = await this.WalletService.createWallet(
        advertiser._id,
        'Advertiser',
        pixKey
      );

      res.status(201).json({
        success: true,
        message: 'Advertiser registered successfully',
        data: {
          advertiser,
          wallet
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Register content creator and create wallet
  async registerContentCreator(req, res) {
    try {
      const { 
        name, 
        email, 
        document, 
        pixKey, 
        phone,
        socialMediaHandles,
        categories,
        followers
      } = req.body;

      // Create content creator
      const contentCreator = new ContentCreator({
        name,
        email,
        document,
        pixKey,
        phone,
        socialMediaHandles,
        categories,
        followers
      });

      await contentCreator.save();

      // Create wallet
      const wallet = await this.walletService.createWallet(
        contentCreator._id,
        'ContentCreator',
        pixKey
      );

      res.status(201).json({
        success: true,
        message: 'Content creator registered successfully',
        data: {
          contentCreator,
          wallet
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Create deposit charge
  async createDepositCharge(req, res) {
    try {
      const { walletId, amount, description } = req.body;

      const result = await this.WalletService.createDepositCharge(
        walletId,
        amount,
        description
      );

      res.status(201).json({
        success: true,
        message: 'Deposit charge created successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get wallet balance
  async getWalletBalance(req, res) {
    try {
      const { userId, userType } = req.params;

      const balance = await this.WalletService.getWalletBalance(userId, userType);

      res.status(200).json({
        success: true,
        data: { balance }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get transaction history
  async getTransactionHistory(req, res) {
    try {
      const { walletId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const transactions = await this.WalletService.getTransactionHistory(
        walletId,
        parseInt(limit),
        parseInt(offset)
      );

      res.status(200).json({
        success: true,
        data: transactions
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = WalletController