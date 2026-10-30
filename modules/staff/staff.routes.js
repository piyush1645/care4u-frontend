const Router = require('express');
const checkToken = require('../../middleware/auth.middleware');
require('dotenv').config();

const staffRoutes = Router();

// Role guard middleware to restrict access to STAFF users
const restrictToStaff = (req, res, next) => {
  if (!req.user || req.user.role !== 'STAFF') {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(403).json({ success: false, message: 'Access Denied: Staff role required' });
    }
    const role = req.user ? req.user.role : null;
    switch (role) {
      case 'PATIENT': return res.redirect('/patient/dashboard');
      case 'DOCTOR': return res.redirect('/doctor/dashboard');
      case 'ADMIN': return res.redirect('/admin/dashboard');
      case 'SUPER_ADMIN': return res.redirect('/superadmin/dashboard');
      default: return res.redirect('/auth/login');
    }
  }
  next();
};

staffRoutes.use(checkToken);
staffRoutes.use(restrictToStaff);

// Backend API base URL
const BACKEND = `http://localhost:${process.env.SERVER_PORT}/api/v1`;

async function backendFetch(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { status: res.status, data: { success: false, message: `Backend returned non-JSON response (${res.status})` } };
  }
  const data = await res.json();
  return { status: res.status, data };
}

const loadStaffProfile = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return next();
    
    const profileResult = await backendFetch(
      `${BACKEND}/staff/dashboard/my-profile`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (profileResult.status === 200 && profileResult.data.success) {
      res.locals.profile = profileResult.data.data || {};
    }
  } catch (error) {
    console.error('Error loading staff profile:', error);
  }
  next();
};

staffRoutes.use(loadStaffProfile);

staffRoutes.get('/dashboard', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };
    const today = new Date().toISOString().split('T')[0];
    const staffId = req.user ? req.user.userId : null;

    if (!staffId) {
      return res.redirect('/auth/login');
    }
    
    if (!res.locals.profile || Object.keys(res.locals.profile).length === 0) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.redirect('/auth/login');
    }

    // Fetch appointments for today and doctors list in parallel
    const [appointmentsResult, doctorsResult] = await Promise.all([
      backendFetch(`${BACKEND}/staff/dashboard/appointments?date=${today}`, { headers: authHeader }),
      backendFetch(`${BACKEND}/staff/dashboard/doctors`, { headers: authHeader }),
    ]);

    if (appointmentsResult.status === 401) {
      return res.redirect('/auth/login');
    }

    res.render('staff/dashboard', {
      appointments: appointmentsResult.data.data || [],
      todayDate:    new Date().toDateString(),
      doctors:      doctorsResult.data.data || [],
    });
  } catch (error) {
    console.error('Error loading staff dashboard:', error);
    res.status(500).render('global/error', {
      statusCode: 500,
      title: 'Dashboard Error',
      message: error.message || 'Failed to load dashboard',
    });
  }
});

staffRoutes.get('/appointments', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const doctorsResult = await backendFetch(`${BACKEND}/staff/dashboard/doctors`, { headers: { Authorization: `Bearer ${token}` } });
    res.render('staff/appointments', { doctors: doctorsResult.data.data || [] });
  } catch (error) {
    res.redirect('/staff/dashboard');
  }
});

staffRoutes.get('/patients', (req, res) => {
  res.render('staff/patients');
});



staffRoutes.get('/doctors', async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    const response = await backendFetch(`${BACKEND}/patient/doctors/search?${new URLSearchParams(req.query).toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status !== 200) {
      const doctorsResult = await backendFetch(`${BACKEND}/staff/dashboard/doctors`, { headers: { Authorization: `Bearer ${token}` } });
      let doctors = doctorsResult.data.data || [];
      
      const { q, speciality } = req.query;
      if (q) {
        const query = String(q).toLowerCase();
        doctors = doctors.filter(d => 
          (d.fullName && d.fullName.toLowerCase().includes(query)) ||
          (d.specialities && d.specialities.some(s => s.toLowerCase().includes(query)))
        );
      }
      if (speciality) {
        const specQuery = String(speciality).toLowerCase();
        doctors = doctors.filter(d =>
          d.specialities && d.specialities.some(s => s.toLowerCase().includes(specQuery))
        );
      }
      return res.render('staff/doctors', { doctorsData: { docs: doctors }, query: req.query });
    }
    res.render('staff/doctors', { doctorsData: response.data.data, query: req.query });
  } catch (error) {
    res.redirect('/staff/dashboard');
  }
});

staffRoutes.get('/doctors/:doctorId', async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId;
    const token = req.cookies.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    // First try the patient endpoint (works if staff token is accepted)
    const response = await backendFetch(`${BACKEND}/patient/doctors/${doctorId}`, { headers: authHeader });

    if (response.status === 200 && response.data.success) {
      return res.render('staff/doctorDetail', { doctor: response.data.data });
    }

    // Patient endpoint blocked for STAFF role — fall back to staff endpoint
    // which returns all doctors scoped to the hospital; find the matching one.
    const allDoctorsResult = await backendFetch(`${BACKEND}/staff/dashboard/doctors`, { headers: authHeader });
    const allDoctors = (allDoctorsResult.data && allDoctorsResult.data.data) ? allDoctorsResult.data.data : [];
    const doctor = allDoctors.find(d => String(d.id) === String(doctorId));

    if (!doctor) {
      return res.render('staff/doctorDetail', { doctor: null });
    }

    res.render('staff/doctorDetail', { doctor });
  } catch (error) {
    console.error('Error loading doctor detail:', error);
    res.redirect('/staff/doctors');
  }
});

staffRoutes.get('/payment', (req, res) => {
  res.render('staff/payment');
});

staffRoutes.get('/profile', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const profileResult = await backendFetch(
      `${BACKEND}/staff/dashboard/my-profile`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (profileResult.status !== 200) {
      return res.redirect('/staff/dashboard');
    }
    res.render('staff/profile', { profileData: profileResult.data.data });
  } catch (error) {
    console.error('Error loading staff profile page:', error);
    res.redirect('/staff/dashboard');
  }
});

staffRoutes.get('/dashboard/appointments', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const { date, doctorId, status } = req.query;

    const params = new URLSearchParams();
    if (date)     params.set('date',     date);
    if (doctorId) params.set('doctorId', doctorId);
    if (status)   params.set('status',   status);

    const { status: httpStatus, data } = await backendFetch(
      `${BACKEND}/staff/dashboard/appointments?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.status(httpStatus).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.get('/dashboard/search-patients', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const q = req.query.q || '';

    const { status, data } = await backendFetch(
      `${BACKEND}/staff/dashboard/search-patients?q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.get('/dashboard/slots', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: 'doctorId and date are required' });
    }

    const { status, data } = await backendFetch(
      `${BACKEND}/staff/dashboard/slots?doctorId=${doctorId}&date=${date}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.post('/dashboard/register-patient', async (req, res) => {
  try {
    const token = req.cookies.accessToken;

    const { status, data } = await backendFetch(
      `${BACKEND}/staff/dashboard/register-patient`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      }
    );
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.post('/dashboard/book-appointment', async (req, res) => {
  try {
    const token = req.cookies.accessToken;

    const { status, data } = await backendFetch(
      `${BACKEND}/staff/dashboard/book-appointment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      }
    );
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.patch('/dashboard/update-profile', async (req, res) => {
  try {
    const token = req.cookies.accessToken;

    const { status, data } = await backendFetch(
      `${BACKEND}/staff/dashboard/update-profile`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      }
    );
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.delete('/dashboard/appointments', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const { status, data } = await backendFetch(
      `${BACKEND}/appointment/appointments`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      }
    );
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.patch('/dashboard/appointments/reschedule', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const { status, data } = await backendFetch(
      `${BACKEND}/appointment/appointments/reschedule`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(req.body),
      }
    );
    res.status(status).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

staffRoutes.get('/dashboard/appointments/:appointmentId/invoice', async (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const response = await fetch(`${BACKEND}/appointments/${req.params.appointmentId}/invoice/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      return res.status(response.status).send('Invoice not available');
    }
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/pdf');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).send('Error downloading invoice');
  }
});

module.exports = staffRoutes;
