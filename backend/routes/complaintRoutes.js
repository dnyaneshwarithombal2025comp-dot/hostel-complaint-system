const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  createComplaint,
  getUserComplaints,
  getComplaintById,
  deleteComplaint
} = require('../controllers/complaintController');

router.use(authMiddleware);

router.post('/', createComplaint);
router.get('/', getUserComplaints);
router.get('/:id', getComplaintById);
router.delete('/:id', deleteComplaint);

module.exports = router;