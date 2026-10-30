const Router = require('express');
const checkToken = require('../../middleware/auth.middleware');
const { fetchFromBackend } = require('../../utils/api');
require('dotenv').config();

const patientRoutes = Router();

// Middlewares
patientRoutes.use(checkToken);
patientRoutes.use(checkToken.roleGuard(['PATIENT']));

const loadPatientProfile = async (req, res, next) => {
    try {
        const response = await fetchFromBackend(req, '/patient/profile');
        if (response.ok) {
            const result = await response.json();
            res.locals.patient = result.data;
        }
    } catch (err) {
        console.error('Error loading patient profile middleware:', err);
    }
    next();
};
patientRoutes.use(loadPatientProfile);

// Routes
patientRoutes.get('/dashboard', async (req, res, next) => {
    try {
        const response = await fetchFromBackend(req, '/patient/dashboard');
        
        if (response.status === 401 || response.status === 403) {
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.redirect('/auth/login');
        }
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const err = new Error(errData.message || 'Failed to fetch dashboard data');
            err.status = response.status;
            return next(err);
        }
        
        const result = await response.json();
        return res.render('patient/dashboard', {
            dashboard: result.data
        });
    } catch (error) {
        return next(error);
    }
});

patientRoutes.get('/profile', (_req, res) => {
    return res.render('patient/profile');
});

patientRoutes.get('/doctors', async (req, res, next) => {
    try {
        const query = req.query;
        const params = new URLSearchParams();
        if (query.q) params.set("q", query.q);
        if (query.speciality) params.set("speciality", query.speciality);
        if (query.hospitalId) params.set("hospitalId", query.hospitalId);
        if (query.page) params.set("page", query.page);
        params.set("limit", query.limit || "9");

        // Fetch active hospitals list to populate the filter dropdown
        const hospitalsRes = await fetchFromBackend(req, '/hospital');
        let hospitals = [];
        if (hospitalsRes.ok) {
            const hospitalsData = await hospitalsRes.json();
            hospitals = hospitalsData.data || [];
        }

        const response = await fetchFromBackend(req, `/patient/doctors/search?${params.toString()}`);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const err = new Error(errData.message || 'Failed to fetch doctors');
            err.status = response.status;
            return next(err);
        }

        const result = await response.json();
        return res.render('patient/doctors', {
            doctorsData: result.data,
            query: query,
            hospitals: hospitals
        });
    } catch (error) {
        return next(error);
    }
});

patientRoutes.get('/doctors/:doctorId', async (req, res, next) => {
    try {
        const doctorId = req.params.doctorId;
        const response = await fetchFromBackend(req, `/patient/doctors/${doctorId}`);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const err = new Error(errData.message || 'Failed to fetch doctor details');
            err.status = response.status;
            return next(err);
        }

        const result = await response.json();
        return res.render('patient/doctorDetail', {
            doctor: result.data
        });
    } catch (error) {
        return next(error);
    }
});

patientRoutes.get('/appointments', (_req, res) => {
    return res.render('patient/appointments');
});

patientRoutes.get('/payment', (_req, res) => {
    return res.render('patient/payment');
});

module.exports = patientRoutes;
