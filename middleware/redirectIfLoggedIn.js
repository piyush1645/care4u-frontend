const jwt = require('jsonwebtoken');
require("dotenv").config();

const redirectIfLoggedIn = (req, res, next) => {
    const token = req.cookies?.accessToken;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.ACCESS_JWT_SECRET);
            if (decoded && decoded.role) {
                switch(decoded.role) {
                    case 'PATIENT': return res.redirect('/patient/dashboard');
                    case 'DOCTOR': return res.redirect('/doctor/dashboard');
                    case 'STAFF': return res.redirect('/staff/dashboard');
                    case 'ADMIN': return res.redirect('/admin/dashboard');
                    case 'SUPER_ADMIN': return res.redirect('/superadmin/dashboard');
                }
            }
        } catch (error) {
            // Token invalid or expired, continue to next middleware
        }
    }
    next();
};

module.exports = redirectIfLoggedIn;
