const express = require('express');
const router = express.Router();
const systemLogController = require('../controllers/systemLogController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

router.get('/', systemLogController.getSystemLogs);
router.get('/:id', systemLogController.getSystemLogById);

module.exports = router;
