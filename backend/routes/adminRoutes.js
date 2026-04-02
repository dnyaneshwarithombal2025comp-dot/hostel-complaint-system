const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const {
  getAllComplaints,
  updateComplaintStatus,
  getStatistics
} = require('../controllers/adminController');

router.use(authMiddleware, adminMiddleware);

router.get('/complaints', getAllComplaints);
router.put('/complaints/:id/status', updateComplaintStatus);
router.get('/statistics', getStatistics);

module.exports = router;