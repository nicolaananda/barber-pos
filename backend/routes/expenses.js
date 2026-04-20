const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');

// GET /api/expenses?month=3&year=2026
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { month, year } = req.query;

        let where = {};
        if (month && year) {
            const m = parseInt(month);
            const y = parseInt(year);
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 0, 23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        });

        if (req.query.page) {
            const total = await prisma.expense.count({ where });
            return res.json({
                data: expenses,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        }
        res.json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
    }
});

// POST /api/expenses
router.post('/', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { description, amount, category } = req.body;

        // Input validation
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return res.status(400).json({ error: 'Description is required' });
        }
        if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }
        if (!category || typeof category !== 'string' || category.trim().length === 0) {
            return res.status(400).json({ error: 'Category is required' });
        }

        const expense = await prisma.expense.create({
            data: {
                description,
                amount,
                category,
                date: new Date(),
            },
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to record expense' });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.expense.delete({ where: { id: Number(id) } });

        res.json({ message: 'Expense deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// GET /api/expenses/export/csv - Export expenses as CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
    try {
        const { month, year } = req.query;
        let where = {};
        if (month && year) {
            const m = parseInt(month);
            const y = parseInt(year);
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 0, 23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        }

        const { format } = require('date-fns');
        const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });

        const header = 'Date,Description,Category,Amount\n';
        const rows = expenses.map(e => {
            const date = format(new Date(e.date), 'yyyy-MM-dd');
            return `"${date}","${e.description}","${e.category}",${e.amount}`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=expenses-${format(new Date(), 'yyyyMMdd')}.csv`);
        res.send(header + rows);
    } catch (error) {
        console.error('Export Expenses CSV Error:', error);
        res.status(500).json({ error: 'Failed to export expenses' });
    }
});

// PATCH /api/expenses/:id
router.patch('/:id', authenticateToken, requireOwner, async (req, res) => {
    try {
        const { description, amount, category } = req.body;
        const { id } = req.params;

        // Input validation
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            return res.status(400).json({ error: 'Description is required' });
        }
        if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) < 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }
        if (!category || typeof category !== 'string' || category.trim().length === 0) {
            return res.status(400).json({ error: 'Category is required' });
        }

        const expense = await prisma.expense.update({
            where: { id: Number(id) },
            data: {
                description,
                amount: Number(amount),
                category,
            },
        });

        res.json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

module.exports = router;
