const adminOnly = (req, res, next) => {
    // req.user is already populated by the 'protect' middleware that runs before this
    if (req.user && req.user.role === 'admin') {
        next(); // They are an admin, let them through
    } else {
        // 403 Forbidden: Authenticated, but lacks administrative clearance
        res.status(403).json({ message: "Access denied. Administrative privileges required." });
    }
};

module.exports = adminOnly;