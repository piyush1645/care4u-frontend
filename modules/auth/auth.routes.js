const Router = require('express');
const redirectIfLoggedIn = require('../../middleware/redirectIfLoggedIn');

const authRoutes = Router();

authRoutes.get("/login", redirectIfLoggedIn, (req, res) => {
    res.render("auth/login")
})

authRoutes.get("/register", redirectIfLoggedIn, (req, res) => {
    res.render("auth/register")
})

authRoutes.get("/forgot-password", redirectIfLoggedIn, (req, res) => {
    res.render("auth/forgotPassword")
})

authRoutes.get("/email", redirectIfLoggedIn, (req, res) => {
    
    res.render("auth/email")
})

authRoutes.get("/otp", redirectIfLoggedIn, (req, res) => {
    res.render("auth/otp")
})

authRoutes.get("/reset-password", redirectIfLoggedIn, (req, res) => {
    res.render("auth/resetPassword")
})



module.exports = authRoutes;