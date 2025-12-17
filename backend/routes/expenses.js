const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/auth');

// GET /api/expenses
router.get('/', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' },
        });
        res.json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// POST /api/expenses
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { description, amount, category } = req.body;

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

// DELETE /api/expenses
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const { id } = req.body;

        await prisma.expense.delete({ where: { id: Number(id) } });

        res.json({ message: 'Expense deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// PATCH /api/expenses
router.patch('/', authenticateToken, async (req, res) => {
    try {
        const { id, description, amount, category } = req.body;

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
