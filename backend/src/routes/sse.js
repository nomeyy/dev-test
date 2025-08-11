const express = require('express');
const sseService = require('../services/sseService');
const router = express.Router();


router.get('/connect', (req, res) => {
    const { userId, sessionId } = req.query;

    try {
        const clientId = sseService.addClient(res, userId, sessionId);

        console.log('SSE Connection established:', {
            clientId,
            userId,
            sessionId,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

    } catch (error) {
        console.error('Error establishing SSE connection:', error);
        res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
});


router.get('/stats', (req, res) => {
    try {
        const stats = sseService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting SSE stats:', error);
        res.status(500).json({ error: 'Failed to get SSE statistics' });
    }
});

module.exports = router;