const express = require('express');
const CampaignController = require('../controller/campaignController');
const router = express.Router();

const campaignController = new CampaignController();

// Campaign management routes
router.post('/create', campaignController.createCampaign.bind(campaignController));
router.put('/:campaignId/publish', campaignController.publishCampaign.bind(campaignController));
router.put('/:campaignId/assign', campaignController.assignContentCreator.bind(campaignController));
router.put('/:campaignId/complete', campaignController.completeCampaign.bind(campaignController));
router.put('/:campaignId/fail', campaignController.failCampaign.bind(campaignController));
router.get('/:campaignId', campaignController.getCampaign.bind(campaignController));
router.get('/', campaignController.listCampaigns.bind(campaignController));

module.exports = router;