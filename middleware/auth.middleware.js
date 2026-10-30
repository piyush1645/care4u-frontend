const jwt = require('jsonwebtoken');
require("dotenv").config();

// Helper to check if a request expects an HTML page response
const expectsHtml = (req) => {
  return req.headers.accept && req.headers.accept.includes('text/html');
};

async function handleRefreshToken(req, res, next) {
  const refreshToken = req.cookies?.refreshToken;
  
  if (!refreshToken) {
    if (expectsHtml(req)) {
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ success: false, message: 'Unauthorized - No refresh token' });
  }

  try {
    const response = await fetch("http://localhost:3004/api/v1/auth/refresh-token", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${refreshToken}`,
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    if (!response.ok || !result.data || !result.data.accessToken) {
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      if (expectsHtml(req)) {
        return res.redirect('/auth/login');
      }
      return res.status(401).json({ success: false, message: 'Unauthorized - Session expired' });
    }

    // Set new cookies (NOT httpOnly so that client-side scripts can read them)
    res.cookie('accessToken', result.data.accessToken, { path: '/' });
    if (result.data.refreshToken) {
      res.cookie('refreshToken', result.data.refreshToken, { path: '/' });
    }

    // Verify the new access token to attach user data
    const decoded = jwt.verify(result.data.accessToken, process.env.ACCESS_JWT_SECRET);
    req.user = decoded;
    
    return next();
  } catch (error) {
    console.error("Refresh Token Error:", error);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    if (expectsHtml(req)) {
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ success: false, message: 'Unauthorized - Session expired' });
  }
}

const checkToken = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token = req.cookies?.accessToken || req.headers?.authorization?.split(' ')[1];

    if (!token) {
      return await handleRefreshToken(req, res, next);
    }

    // Decode and verify token
    const decoded = jwt.verify(token, process.env.ACCESS_JWT_SECRET);

    req.user = decoded; // attach to request
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return await handleRefreshToken(req, res, next);
    }
    
    console.error("Token verification error:", error);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    if (expectsHtml(req)) {
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ success: false, message: 'Unauthorized - Invalid token' });  
  }
};

// Production level Role Guard helper
const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      if (expectsHtml(req)) {
        return res.redirect('/auth/login');
      }
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`Access Denied for role: ${req.user.role}. Allowed: ${allowedRoles}`);
      
      if (expectsHtml(req)) {
        // Redirect to their respective dashboards based on role
        switch (req.user.role) {
          case 'PATIENT':
            return res.redirect('/patient/dashboard');
          case 'DOCTOR':
            return res.redirect('/doctor/dashboard');
          case 'STAFF':
            return res.redirect('/staff/dashboard');
          case 'ADMIN':
            return res.redirect('/admin/dashboard');
          case 'SUPER_ADMIN':
            return res.redirect('/superadmin/dashboard');
          default:
            return res.redirect('/auth/login');
        }
      }
      
      return res.status(403).json({ success: false, message: 'Forbidden - Access Denied' });
    }
    
    next();
  };
};

checkToken.roleGuard = roleGuard;

module.exports = checkToken;
