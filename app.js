require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { CLIENT_RENEG_LIMIT } = require('tls');
const app = express();
app.locals.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3004/api/v1';
app.use((req, res, next) => {
    res.locals.apiBaseUrl = app.locals.apiBaseUrl;
    next();
});
const  setupRoutes  = require('./routes/index');
const redirectIfLoggedIn = require('./middleware/redirectIfLoggedIn');

app.set("view engine" , "ejs")
app.use(express.static(path.join(__dirname , "public")))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/" , redirectIfLoggedIn, (req,res)=>{
    
    res.render("global/home")
})

app.use('/', setupRoutes());

app.get('/logout', (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.redirect('/auth/login');
});

// Fallback 404 handler
app.use((req, res, next) => {
    res.status(404).render('global/error', {
        statusCode: 404,
        title: 'Page Not Found',
        message: "We couldn't find the page you're looking for. It might have been moved, deleted, or never existed."
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).render('global/error', {
        statusCode: statusCode,
        title: statusCode === 500 ? 'Internal Server Error' : 'An Error Occurred',
        message: err.message || 'Something went wrong on our end. Please try again later.'
    });
});

module.exports = { app };