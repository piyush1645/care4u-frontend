const Router = require('express');
const checkToken = require('../../middleware/auth.middleware');

const superAdminRoutes = Router();

superAdminRoutes.use(checkToken);
superAdminRoutes.use(checkToken.roleGuard(['SUPER_ADMIN']));

superAdminRoutes.get("/dashboard", checkToken, (req, res) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        return res.render("superadmin/superadminDashboard");
    }
    return res.status(403).send("Forbidden: Only SUPER_ADMIN accounts can access this portal.");
});

superAdminRoutes.get("/analytics", checkToken, (req, res) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        return res.render("superadmin/superadminAnalytics");
    }
    return res.status(403).send("Forbidden: Only SUPER_ADMIN accounts can access this portal.");
});

module.exports = superAdminRoutes;