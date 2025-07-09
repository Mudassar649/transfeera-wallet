const Campaign = require('../models/Campaign');
const WalletService = require('../services/walletService');
const Advertiser = require('../models/advertiser');
const ContentCreator = require('../models/contentCreator');

class CampaignController {
  constructor() {
    this.walletService = new WalletService();
  }

  // Create campaign
  async createCampaign(req, res) {
    try {
      const {
        title,
        description,
        advertiserId,
        budget,
        startDate,
        endDate,
        requirements,
        deliverables
      } = req.body;

      // Verify advertiser exists
      const advertiser = await Advertiser.findById(advertiserId);
      if (!advertiser) {
        return res.status(404).json({
          success: false,
          message: 'Advertiser not found'
        });
      }

      // Create campaign
      const campaign = new Campaign({
        title,
        description,
        advertiser: advertiserId,
        budget,
        startDate,
        endDate,
        requirements,
        deliverables,
        status: 'DRAFT'
      });

      await campaign.save();

      res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: campaign
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Publish campaign (transfer funds to escrow)
  async publishCampaign(req, res) {
    try {
      const { campaignId } = req.params;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      if (campaign.status !== 'DRAFT') {
        return res.status(400).json({
          success: false,
          message: 'Campaign cannot be published in current status'
        });
      }

      // Transfer funds to escrow
      const result = await this.walletService.transferToEscrow(campaignId);

      // Update campaign status
      campaign.status = 'ACTIVE';
      await campaign.save();

      res.status(200).json({
        success: true,
        message: 'Campaign published successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Assign content creator to campaign
  async assignContentCreator(req, res) {
    try {
      const { campaignId } = req.params;
      const { contentCreatorId } = req.body;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      const contentCreator = await ContentCreator.findById(contentCreatorId);
      if (!contentCreator) {
        return res.status(404).json({
          success: false,
          message: 'Content creator not found'
        });
      }

      campaign.contentCreator = contentCreatorId;
      campaign.status = 'ASSIGNED';
      await campaign.save();

      res.status(200).json({
        success: true,
        message: 'Content creator assigned successfully',
        data: campaign
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Mark campaign as completed
  async completeCampaign(req, res) {
    try {
      const { campaignId } = req.params;

      const result = await this.walletService.completeCampaign(campaignId);

      res.status(200).json({
        success: true,
        message: 'Campaign completed successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Mark campaign as failed (refund)
  async failCampaign(req, res) {
    try {
      const { campaignId } = req.params;
      const { reason } = req.body;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      // Process refund
      const result = await this.walletService.refundCampaign(campaignId);

      res.status(200).json({
        success: true,
        message: 'Campaign refunded successfully',
        data: { ...result, reason }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get campaign details
  async getCampaign(req, res) {
    try {
      const { campaignId } = req.params;

      const campaign = await Campaign.findById(campaignId)
        .populate('advertiser')
        .populate('contentCreator')
        .populate('escrowTransactionId')
        .populate('paymentTransactionId')
        .populate('commissionTransactionId');

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      res.status(200).json({
        success: true,
        data: campaign
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // List campaigns
  async listCampaigns(req, res) {
    try {
      const { 
        status, 
        advertiserId, 
        contentCreatorId, 
        limit = 20, 
        offset = 0 
      } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (advertiserId) filter.advertiser = advertiserId;
      if (contentCreatorId) filter.contentCreator = contentCreatorId;

      const campaigns = await Campaign.find(filter)
        .populate('advertiser', 'name email company')
        .populate('contentCreator', 'name email socialMediaHandles')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

      const total = await Campaign.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          campaigns,
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = CampaignController;