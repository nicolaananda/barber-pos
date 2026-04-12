const requireOwner = (req, res, next) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owners can perform this action' });
    }
    next();
};

module.exports = requireOwner;
