// routes/walletRoutes.js
const express = require('express');
const WalletController = require('../controller/walletController');
const router = express.Router();

const walletController = new WalletController();

// User registration routes
router.post('/register/advertiser', walletController.registerAdvertiser.bind(walletController));
router.post('/register/content-creator', walletController.registerContentCreator.bind(walletController));

// Wallet operations
router.post('/deposit/charge', walletController.createDepositCharge.bind(walletController));
router.get('/balance/:userId/:userType', walletController.getWalletBalance.bind(walletController));
router.get('/transactions/:walletId', walletController.getTransactionHistory.bind(walletController));

module.exports = router;