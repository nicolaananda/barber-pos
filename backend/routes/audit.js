const express = require('express');
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');

const router = express.Router();
const auditFile = path.join(__dirname, '../logs/audit.log');

// GET /api/audit - owner-only, read-only audit history
router.get('/', authenticateToken, requireOwner, async (req, res) => {
    try {
        if (!fs.existsSync(auditFile)) return res.json([]);

        const content = await fs.promises.readFile(auditFile, 'utf8');
        // ponytail: File log and 200 recent rows are enough for current traffic; move to a paginated DB table when retention grows.
        const entries = content.split('\n')
            .filter(Boolean)
            .map((line) => {
                try { return JSON.parse(line); } catch { return null; }
            })
            .filter(Boolean)
            .reverse()
            .slice(0, 200);

        const userIds = [...new Set(entries.map((entry) => entry.userId).filter(Number.isInteger))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
        });
        const userNames = new Map(users.map((user) => [user.id, user.name]));

        res.json(entries.map((entry) => ({
            ...entry,
            userName: userNames.get(entry.userId) || null,
        })));
    } catch (error) {
        console.error('Audit Log Error:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

module.exports = router;
