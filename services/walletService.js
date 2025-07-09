const Wallet = require('../models/wallet');
const Transaction = require('../models/transaction');
const Campaign = require('../models/Campaign');
const Admin = require('../models/Admin');
const TransfeeraPIX = require('./transfeeraService').TransfeeraPIX;


class WalletService{
    constructor(){
        this.transfeera = new TransfeeraPIX({
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            pixKey: process.env.PIX_KEY,
            authToken: process.env.TRANSFEERA_AUTH_TOKEN,
            sandbox: process.env.NODE_ENV ?? 'production'
        });
    }

    // Create wallet for user
  async createWallet(userId, userType, pixKey) {
    try {
      const existingWallet = await Wallet.findOne({ userId, userType });
      if (existingWallet) {
        throw new Error('Wallet already exists for this user');
      }

      const wallet = new Wallet({
        userId,
        userType,
        pixKey,
        balance: 0
      });

      await wallet.save();
      return wallet;
    } catch (error) {
      throw new Error(`Error creating wallet: ${error.message}`);
    }
  }

  // Generate transaction ID
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create PIX charge for wallet deposit
  async createDepositCharge(walletId, amount, description) {
    try {
      const wallet = await Wallet.findById(walletId).populate('userId');
      wallet.balance = wallet.balance - amount;
      wallet.save();
      const adminWallet = await Admin.findOne();
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const transactionId = this.generateTransactionId();
      
      // Create PIX charge using Transfeera
      // const charge = await this.transfeera.createPixCharge({
      //   amount: TransfeeraPIX.formatAmount(amount),
      //   description: description || `Deposit to ${wallet.userType} wallet`,
      //   externalId: transactionId,
      //   customer: {
      //     name: wallet.userId.name,
      //     document: wallet.userId.document,
      //     email: wallet.userId.email
      //   }
      // });

      // Create transaction record
      const transaction = new Transaction({
        transactionId,
        transfereeraTransactionId: 'PBK#&($&#H#7389389' ?? charge.id,
        fromWallet: walletId,
        toWallet: adminWallet._id,
        amount,
        type: 'DEPOSIT',
        status: 'PENDING',
        description: description || `Deposit to ${wallet.userType} wallet`,
        pixChargeId: '23447383' ?? charge.id,
        metadata: {
          qrCode: 'kekek3m3nn3' ?? charge.qr_code_url,
          pixCopyPaste: 'kekek3m3nn3' ?? charge.pix_copy_paste
        }
      });

      await transaction.save();

      return {
        transaction,
        charge: {
          id: '23447383' ?? charge.id,
          qrCode: 'kekek3m3nn3' ?? charge.qr_code_url,
          pixCopyPaste: 'kekek3m3nn3' ?? charge.pix_copy_paste
        }
      };
    } catch (error) {
      throw new Error(`Error creating deposit charge: ${error.message}`);
    }
  }

  // Process successful deposit (called from webhook)
  async processDepositSuccess(chargeId, amount) {
    try {
      const transaction = await Transaction.findOne({ 
        pixChargeId: chargeId,
        type: 'DEPOSIT',
        status: 'PENDING'
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update wallet balance
      const wallet = await Wallet.findById(transaction.toWallet);
      wallet.balance += amount;
      await wallet.save();

      // Update transaction status
      transaction.status = 'COMPLETED';
      transaction.completedAt = new Date();
      await transaction.save();

      return { transaction, wallet };
    } catch (error) {
      throw new Error(`Error processing deposit: ${error.message}`);
    }
  }

  
  // Transfer funds for campaign escrow
  async transferToEscrow(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId).populate('advertiser');
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const advertiserWallet = await Wallet.findOne({ 
        userId: campaign.advertiser._id,
        userType: 'Advertiser'
      });

      if (!advertiserWallet) {
        throw new Error('Advertiser wallet not found');
      }

      if (advertiserWallet.balance < campaign.budget) {
        throw new Error('Insufficient funds in advertiser wallet');
      }

      // Get admin wallet
      const adminWallet = await Wallet.findOne({ userType: 'Admin' });
      if (!adminWallet) {
        throw new Error('Admin wallet not found');
      }

      const transactionId = this.generateTransactionId();

      // Create escrow transaction
      const escrowTransaction = new Transaction({
        transactionId,
        transfereeraTransactionId: `ESCROW_${transactionId}`,
        fromWallet: advertiserWallet._id,
        toWallet: adminWallet._id,
        amount: campaign.budget,
        type: 'CAMPAIGN_ESCROW',
        status: 'COMPLETED',
        campaignId,
        description: `Campaign escrow for: ${campaign.title}`,
        completedAt: new Date()
      });

      // Update wallet balances
      advertiserWallet.balance -= campaign.budget;
      adminWallet.balance += campaign.budget;

      // Update campaign status
      campaign.paymentStatus = 'ESCROWED';
      campaign.escrowTransactionId = escrowTransaction._id;

      // Save all changes
      await Promise.all([
        advertiserWallet.save(),
        adminWallet.save(),
        escrowTransaction.save(),
        campaign.save()
      ]);

      return { transaction: escrowTransaction, campaign };
    } catch (error) {
      throw new Error(`Error transferring to escrow: ${error.message}`);
    }
  }

  // Complete campaign and distribute funds
  async completeCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId)
        .populate('advertiser')
        .populate('contentCreator');

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.paymentStatus !== 'ESCROWED') {
        throw new Error('Campaign funds not in escrow');
      }

      if (!campaign.contentCreator) {
        throw new Error('Content creator not assigned to campaign');
      }

      // Get wallets
      const adminWallet = await Wallet.findOne({ userType: 'Admin' });
      const creatorWallet = await Wallet.findOne({ 
        userId: campaign.contentCreator._id,
        userType: 'ContentCreator'
      });

      if (!adminWallet || !creatorWallet) {
        throw new Error('Required wallets not found');
      }

      // Calculate amounts (80% to creator, 20% to admin)
      const creatorAmount = campaign.budget * 0.8;
      const adminCommission = campaign.budget * 0.2;

      const paymentTransactionId = this.generateTransactionId();
      const commissionTransactionId = this.generateTransactionId();

      // Create payment transaction to content creator
      const paymentTransaction = new Transaction({
        transactionId: paymentTransactionId,
        transfereeraTransactionId: `PAYMENT_${paymentTransactionId}`,
        fromWallet: adminWallet._id,
        toWallet: creatorWallet._id,
        amount: creatorAmount,
        type: 'CAMPAIGN_PAYMENT',
        status: 'PENDING',
        campaignId,
        description: `Payment for campaign: ${campaign.title}`
      });

      // Create commission transaction
      const commissionTransaction = new Transaction({
        transactionId: commissionTransactionId,
        transfereeraTransactionId: `COMMISSION_${commissionTransactionId}`,
        fromWallet: adminWallet._id,
        toWallet: adminWallet._id,
        amount: adminCommission,
        type: 'COMMISSION',
        status: 'COMPLETED',
        campaignId,
        description: `Commission for campaign: ${campaign.title}`,
        completedAt: new Date()
      });

      // Create PIX payment to content creator
      const pixPayment = await this.transfeera.createPixPayment({
        amount: TransfeeraPIX.formatAmount(creatorAmount),
        pixKey: campaign.contentCreator.pixKey,
        description: `Payment for campaign: ${campaign.title}`,
        externalId: paymentTransactionId,
        payer: {
          name: 'Platform Admin',
          document: process.env.PLATFORM_DOCUMENT,
          email: process.env.PLATFORM_EMAIL
        }
      });

      // Update payment transaction with PIX details
      paymentTransaction.pixPaymentId = pixPayment.id;
      paymentTransaction.transfereeraTransactionId = pixPayment.id;

      // Update wallet balances
      adminWallet.balance -= creatorAmount; // Admin pays creator
      creatorWallet.balance += creatorAmount;
      // Admin commission stays in admin wallet (already there from escrow)

      // Update campaign
      campaign.status = 'COMPLETED';
      campaign.paymentStatus = 'RELEASED';
      campaign.paymentTransactionId = paymentTransaction._id;
      campaign.commissionTransactionId = commissionTransaction._id;

      // Save all changes
      await Promise.all([
        adminWallet.save(),
        creatorWallet.save(),
        paymentTransaction.save(),
        commissionTransaction.save(),
        campaign.save()
      ]);

      return { 
        paymentTransaction, 
        commissionTransaction, 
        campaign,
        pixPayment 
      };
    } catch (error) {
      throw new Error(`Error completing campaign: ${error.message}`);
    }
  }

  // Refund campaign funds to advertiser
  async refundCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId).populate('advertiser');
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.paymentStatus !== 'ESCROWED') {
        throw new Error('Campaign funds not in escrow');
      }

      // Get wallets
      const adminWallet = await Wallet.findOne({ userType: 'Admin' });
      const advertiserWallet = await Wallet.findOne({ 
        userId: campaign.advertiser._id,
        userType: 'Advertiser'
      });

      if (!adminWallet || !advertiserWallet) {
        throw new Error('Required wallets not found');
      }

      const refundTransactionId = this.generateTransactionId();

      // Create refund transaction
      const refundTransaction = new Transaction({
        transactionId: refundTransactionId,
        transfereeraTransactionId: `REFUND_${refundTransactionId}`,
        fromWallet: adminWallet._id,
        toWallet: advertiserWallet._id,
        amount: campaign.budget,
        type: 'CAMPAIGN_REFUND',
        status: 'PENDING',
        campaignId,
        description: `Refund for campaign: ${campaign.title}`
      });

      // Create PIX payment to advertiser
      const pixRefund = await this.transfeera.createPixPayment({
        amount: TransfeeraPIX.formatAmount(campaign.budget),
        pixKey: campaign.advertiser.pixKey,
        description: `Refund for campaign: ${campaign.title}`,
        externalId: refundTransactionId,
        payer: {
          name: 'Platform Admin',
          document: process.env.PLATFORM_DOCUMENT,
          email: process.env.PLATFORM_EMAIL
        }
      });

      // Update refund transaction with PIX details
      refundTransaction.pixPaymentId = pixRefund.id;
      refundTransaction.transfereeraTransactionId = pixRefund.id;

      // Update wallet balances
      adminWallet.balance -= campaign.budget;
      advertiserWallet.balance += campaign.budget;

      // Update campaign
      campaign.status = 'CANCELLED';
      campaign.paymentStatus = 'REFUNDED';

      // Save all changes
      await Promise.all([
        adminWallet.save(),
        advertiserWallet.save(),
        refundTransaction.save(),
        campaign.save()
      ]);

      return { refundTransaction, campaign, pixRefund };
    } catch (error) {
      throw new Error(`Error refunding campaign: ${error.message}`);
    }
  }

  // Get wallet balance
  async getWalletBalance(userId, userType) {
    try {
      const wallet = await Wallet.findOne({ userId, userType });
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      return wallet.balance;
    } catch (error) {
      throw new Error(`Error getting wallet balance: ${error.message}`);
    }
  }

  // Get transaction history
  async getTransactionHistory(walletId, limit = 50, offset = 0) {
    try {
      const transactions = await Transaction.find({
        $or: [
          { fromWallet: walletId },
          { toWallet: walletId }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .populate('fromWallet toWallet campaignId');

      return transactions;
    } catch (error) {
      throw new Error(`Error getting transaction history: ${error.message}`);
    }
  }
}

module.exports = WalletService;