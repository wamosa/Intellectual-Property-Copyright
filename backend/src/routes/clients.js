const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getHighRiskClientsController,
  updateClientRiskScore,
  getClientStats
} = require('../controllers/clientController');

// GET /api/clients - Get all clients with filtering and pagination
router.get('/', getClients);

// GET /api/clients/stats - Get client statistics for dashboard
router.get('/stats', getClientStats);

// GET /api/clients/high-risk - Get high-risk clients
router.get('/high-risk', getHighRiskClientsController);

// GET /api/clients/:id - Get single client by ID
router.get('/:id', getClientById);

// POST /api/clients - Create new client
router.post('/', createClient);

// PUT /api/clients/:id - Update client
router.put('/:id', updateClient);

// DELETE /api/clients/:id - Delete client
router.delete('/:id', deleteClient);

// PUT /api/clients/:id/risk-score - Update client risk score manually
router.put('/:id/risk-score', updateClientRiskScore);

module.exports = router;