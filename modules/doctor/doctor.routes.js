const Router = require('express');
const checkToken = require('../../middleware/auth.middleware');
require("dotenv").config();

const DoctorRoutes = Router();

// In-memory store for active meetings
const mockMeetings = {};

// ── Role guard ────────────────────────────────────────────────────────────────
const restrictTo = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).render("global/error", {
                statusCode: 403,
                title: "Access Denied",
                message: "You do not have permission to access this page."
            });
        }
        return next();
    };
};

DoctorRoutes.use(checkToken);
DoctorRoutes.use(checkToken.roleGuard(['DOCTOR', 'ADMIN', 'SUPER_ADMIN']));

// Store doctorId in res.locals for templates (non-doctor roles only)
DoctorRoutes.use((req, res, next) => {
    res.locals.user = req.user || null;
    if (req.user && req.user.role !== 'DOCTOR') {
        res.locals.doctorId = req.query?.doctorId || req.body?.doctorId || null;
    } else {
        res.locals.doctorId = null;
    }
    next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the target doctorId.
 * - DOCTOR: always their own ID from the JWT
 * - ADMIN / SUPER_ADMIN: must supply ?doctorId= query param
 */
const getDoctorId = (req, res) => {
    if (req.user.role === 'DOCTOR') {
        return req.user.userId;
    }
    const doctorId = req.query.doctorId || req.body.doctorId;
    if (!doctorId) {
        res.status(400).render("global/error", {
            statusCode: 400,
            title: "Doctor ID Required",
            message: "As an Administrator, you must specify a ?doctorId=X query parameter to view a doctor's portal."
        });
        return null;
    }
    return doctorId;
};

/**
 * Check a backend fetch() response for auth/access errors.
 * Returns true  → error was handled, caller must return immediately.
 * Returns false → response is fine, caller may proceed.
 *
 * 401 → redirect to login
 * 403 → render "Access Denied" page (hospital-group violation)
 */
const checkBackendAccess = async (apiResponse, res) => {
    if (apiResponse.status === 401) {
        res.redirect('/auth/login');
        return true;
    }
    if (apiResponse.status === 403) {
        let errMsg = "You do not have permission to access this data.";
        try {
            const errData = await apiResponse.clone().json();
            errMsg = errData.message || errMsg;
        } catch (e) {
            // Ignore JSON parsing errors
        }
        res.status(403).render("global/error", {
            statusCode: 403,
            title: "Access Denied",
            message: errMsg
        });
        return true;
    }
    if (!apiResponse.ok) {
        let errMsg = "An error occurred while communicating with the backend services.";
        try {
            const errData = await apiResponse.clone().json();
            errMsg = errData.message || errMsg;
        } catch (e) {
            // Ignore JSON parsing errors
        }
        res.status(apiResponse.status).render("global/error", {
            statusCode: apiResponse.status,
            title: apiResponse.status === 400 ? "Bad Request" : "Internal Server Error",
            message: errMsg
        });
        return true;
    }
    return false;
};

// ── GET /doctor/dashboard ─────────────────────────────────────────────────────
DoctorRoutes.get("/dashboard", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const doctorInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/dashboard`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
        });

        if (await checkBackendAccess(doctorInfo, res)) return;

        const doctorData = await doctorInfo.json();
        const summary = doctorData.response.data.summary;
        const upcomingLeaves = doctorData.response.data.upcomingLeaves;
        let upcomingAppointmentsRaw = doctorData?.response?.data?.upcomingAppointments || [];
        if (upcomingAppointmentsRaw.length === 0) {
            upcomingAppointmentsRaw = doctorData?.response?.data?.allAppointments?.booked || [];
        }

        const upcomingAppointments = upcomingAppointmentsRaw.map(app => {
            let dateObj = new Date(app.appointmentDate);
            
            // Shift past appointments to future for realistic upcoming demo
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dateObj < today) {
                dateObj = new Date();
                const diffDays = Number(app.id) % 3;
                dateObj.setDate(dateObj.getDate() + diffDays);
            }
            
            const startTime = new Date(app.appointmentStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const endTime   = new Date(app.appointmentEndTime).toLocaleTimeString('en-US',   { hour: '2-digit', minute: '2-digit' });
            return {
                id: app.id,
                patientName: app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : "Unknown Patient",
                patientId: app.patient?.id || null,
                reason: app.reason || "General Consultation",
                status: app.status,
                date: dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                time: `${startTime} - ${endTime}`,
                type: app.type || (Number(app.id) % 2 === 0 ? 'ONLINE' : 'IN_PERSON'),
                meeting: app.meeting ? {
                    id: app.meeting.id.toString(),
                    link: app.meeting.joinUrl || app.meeting.link,
                    startUrl: app.meeting.startUrl,
                    status: app.meeting.status
                } : (mockMeetings[app.id] || null)
            };
        });

        const doctor = doctorData?.response?.data?.doctor || { firstName: "", lastName: "Doctor" };
        res.render("doctor/dashboard", { summary, upcomingLeaves, upcomingAppointments, doctor });
    } catch (error) {
        console.error("Error fetching doctor dashboard:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while fetching the doctor dashboard."
        });
    }
});

// ── GET /doctor/profile ───────────────────────────────────────────────────────
DoctorRoutes.get("/profile", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const [profileInfo, leavesInfo] = await Promise.all([
            fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
            }),
            fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/leaves`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
            })
        ]);

        if (await checkBackendAccess(profileInfo, res)) return;
        if (await checkBackendAccess(leavesInfo, res)) return;

        const profileData = await profileInfo.json();
        const leavesData  = await leavesInfo.json();

        const doctor        = profileData?.response?.data || {};
        const upcomingLeaves = leavesData?.response?.data || [];

        res.render("doctor/profile", { doctor, upcomingLeaves, serverPort: process.env.SERVER_PORT, user: req.user });
    } catch (error) {
        console.error("Error fetching doctor profile:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while fetching the doctor profile."
        });
    }
});

// ── GET /doctor/profile/edit ──────────────────────────────────────────────────
DoctorRoutes.get("/profile/edit", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const profileInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
        });

        if (await checkBackendAccess(profileInfo, res)) return;

        const profileData = await profileInfo.json();
        const doctor = profileData?.response?.data || {};

        res.render("doctor/editProfile", { doctor, serverPort: process.env.SERVER_PORT });
    } catch (error) {
        console.error("Error fetching doctor profile for edit:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while loading the edit profile page."
        });
    }
});

// ── POST /doctor/profile/edit ─────────────────────────────────────────────────
DoctorRoutes.post("/profile/edit", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile/edit`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error updating doctor profile:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── GET /doctor/appointments ──────────────────────────────────────────────────
DoctorRoutes.get("/appointments", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const doctorInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/dashboard`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
        });

        if (await checkBackendAccess(doctorInfo, res)) return;

        const doctorData = await doctorInfo.json();
        let upcomingAppointmentsRaw = doctorData?.response?.data?.upcomingAppointments || [];
        if (upcomingAppointmentsRaw.length === 0) {
            upcomingAppointmentsRaw = [
                ...(doctorData?.response?.data?.allAppointments?.booked || []),
                ...(doctorData?.response?.data?.allAppointments?.ongoing || [])
            ];
        }

        const nowMs = Date.now();
        const ACTIONED_STATUSES = new Set(['ON_GOING', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);

        const upcomingAppointments = upcomingAppointmentsRaw.map(app => {
            let dateObj    = new Date(app.appointmentDate);
            
            // Shift past appointments to future for realistic upcoming demo
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dateObj < today) {
                dateObj = new Date();
                const diffDays = Number(app.id) % 3;
                dateObj.setDate(dateObj.getDate() + diffDays);
            }
            
            const startTime  = new Date(app.appointmentStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const startMs    = new Date(app.appointmentStartTime).getTime();
            const endMs      = new Date(app.appointmentEndTime).getTime();
            const durationMins = Math.round((endMs - startMs) / 60000);
            const adjustedStart = new Date(dateObj);
            const rawStart = new Date(app.appointmentStartTime);
            adjustedStart.setHours(rawStart.getHours(), rawStart.getMinutes(), rawStart.getSeconds(), rawStart.getMilliseconds());
            const adjustedEnd = new Date(adjustedStart.getTime() + (durationMins * 60000));

            return {
                id: app.id,
                patientName:  app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : "Unknown Patient",
                patientPhoto: app.patient?.profilePhoto || "https://37assets.37signals.com/svn/765-default-avatar.png",
                patientId:    app.patient?.id || "N/A",
                reason: app.reason || "General Consultation",
                status: app.status === 'BOOKED' ? 'Confirmed' : app.status,
                date:   dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                time:   `${startTime} (${durationMins} min)`,
                rawDate: dateObj,
                type: app.type || (Number(app.id) % 2 === 0 ? 'ONLINE' : 'IN_PERSON'),
                startTimeMs: adjustedStart.getTime(),
                endTimeMs: adjustedEnd.getTime(),
                meeting: app.meeting ? {
                    id: app.meeting.id.toString(),
                    link: app.meeting.joinUrl || app.meeting.link,
                    startUrl: app.meeting.startUrl,
                    status: app.meeting.status
                } : (mockMeetings[app.id] || null)
            };
        }).filter(app => {
            // Remove appointments that are still "Confirmed" or "RESCHEDULED" but
            // whose scheduled slot has already completely passed (end time is in the past).
            // Actioned appointments (ON_GOING, COMPLETED, CANCELLED, NO_SHOW) are always shown.
            const mappedStatus = app.status;
            const isActioned = ACTIONED_STATUSES.has(mappedStatus);
            if (isActioned) return true;
            // For Confirmed / RESCHEDULED: hide if end time has passed
            return app.endTimeMs > nowMs;
        });

        const todayStr      = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const todayFormatted = `Today, ${todayStr}`;

        res.render("doctor/appointments", {
            upcomingAppointments,
            todayFormatted,
            totalAppointments: upcomingAppointments.length
        });
    } catch (error) {
        console.error("Error fetching doctor appointments:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while fetching appointments."
        });
    }
});

// ── GET /doctor/all-appointments ──────────────────────────────────────────────
DoctorRoutes.get("/all-appointments", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const page  = req.query.page  || 1;
        const limit = req.query.limit || 5;

        const appointmentsInfo = await fetch(
            `http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/appointments?page=${page}&limit=${limit}`,
            { method: "GET", headers: { "Authorization": `Bearer ${req.cookies.accessToken}` } }
        );

        if (await checkBackendAccess(appointmentsInfo, res)) return;

        const appointmentsData = await appointmentsInfo.json();
        const allAppointmentsRaw = appointmentsData?.response?.data?.appointments || [];
        const paginationInfo     = appointmentsData?.response?.data?.pagination    || { total: 0, page: 1, limit: 5, totalPages: 1 };

        const allAppointments = allAppointmentsRaw.map(app => {
            const dateObj    = new Date(app.appointmentDate);
            const timeStr    = new Date(app.appointmentStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const pFirstName = app.patient?.firstName || "Unknown";
            const pLastName  = app.patient?.lastName  || "Patient";
            return {
                id: app.id,
                patientName:     `${pFirstName} ${pLastName}`,
                patientPhoto:    app.patient?.profilePhoto || null,
                patientInitials: `${pFirstName.charAt(0)}${pLastName.charAt(0)}`.toUpperCase(),
                patientId:       app.patient?.id || "N/A",
                reason: app.reason || "General Consultation",
                status: app.status,
                date:   dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                time:   timeStr,
                rawDate: dateObj,
                type: app.type || (Number(app.id) % 2 === 0 ? 'ONLINE' : 'IN_PERSON'),
                startTimeMs: new Date(app.appointmentStartTime).getTime(),
                meeting: app.meeting ? {
                    id: app.meeting.id.toString(),
                    link: app.meeting.joinUrl || app.meeting.link,
                    startUrl: app.meeting.startUrl,
                    status: app.meeting.status
                } : (mockMeetings[app.id] || null)
            };
        });

        res.render("doctor/allAppointments", { allAppointments, pagination: paginationInfo });
    } catch (error) {
        console.error("Error fetching all doctor appointments:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while fetching all appointments."
        });
    }
});

// ── GET /doctor/export-appointments-csv ───────────────────────────────────────────
DoctorRoutes.get("/export-appointments-csv", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const appointmentsInfo = await fetch(
            `http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/appointments?page=1&limit=10000`,
            { method: "GET", headers: { "Authorization": `Bearer ${req.cookies.accessToken}` } }
        );

        if (await checkBackendAccess(appointmentsInfo, res)) return;

        const appointmentsData = await appointmentsInfo.json();
        const allAppointmentsRaw = appointmentsData?.response?.data?.appointments || [];

        let csvContent = "Patient Name,Patient ID,Date,Time,Visit Type,Reason,Status\n";
        
        allAppointmentsRaw.forEach(app => {
            const dateObj = new Date(app.appointmentDate);
            const timeStr = new Date(app.appointmentStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const pFirstName = app.patient?.firstName || "Unknown";
            const pLastName  = app.patient?.lastName  || "Patient";
            const patientName = `"${pFirstName} ${pLastName}"`;
            const patientId = `"MC-${app.patient?.id || 'N/A'}"`;
            const date = `"${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}"`;
            const time = `"${timeStr}"`;
            const visitType = app.type || "IN_PERSON";
            const reason = `"${(app.reason || 'General Consultation').replace(/"/g, '""')}"`;
            const status = app.status;

            csvContent += `${patientName},${patientId},${date},${time},${visitType},${reason},${status}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=appointments_export.csv');
        res.status(200).send(csvContent);
    } catch (error) {
        console.error("Error exporting appointments CSV:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while exporting appointments CSV."
        });
    }
});

// ── GET /doctor/leaves ────────────────────────────────────────────────────────
DoctorRoutes.get("/leaves", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const leavesInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/leaves`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
        });

        if (await checkBackendAccess(leavesInfo, res)) return;

        const leavesData     = await leavesInfo.json();
        const upcomingLeaves = leavesData?.response?.data || [];

        res.render("doctor/leaves", { upcomingLeaves });
    } catch (error) {
        console.error("Error fetching doctor leaves:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while fetching leave requests."
        });
    }
});

// ── POST /doctor/leaves ───────────────────────────────────────────────────────
DoctorRoutes.post("/leaves", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/get-leaves`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error submitting leave request:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── DELETE /doctor/leaves/:leaveId ────────────────────────────────────────────
DoctorRoutes.delete("/leaves/:leaveId", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/leaves/${req.params.leaveId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error deleting leave request:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── GET /doctor/settings ──────────────────────────────────────────────────────
DoctorRoutes.get("/settings", checkToken, (req, res) => {
    res.render("doctor/settings");
});

// ── GET /doctor/schedule ──────────────────────────────────────────────────────
DoctorRoutes.get("/schedule", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const scheduleInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/get-schedules`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
        });

        if (await checkBackendAccess(scheduleInfo, res)) return;

        const scheduleData = await scheduleInfo.json();
        const schedule     = scheduleData?.response?.data?.[0] || null;

        res.render("doctor/schedule", { schedule, serverPort: process.env.SERVER_PORT });
    } catch (error) {
        console.error("Error fetching doctor schedule:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while fetching doctor schedule."
        });
    }
});

// ── PATCH /doctor/schedule ────────────────────────────────────────────────────
DoctorRoutes.patch("/schedule", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/update-schedules`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── PATCH /doctor/profile-photo ───────────────────────────────────────────────
DoctorRoutes.patch("/profile-photo", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/profile-photo`, {
            method: 'PATCH',
            headers: {
                'Authorization':  `Bearer ${req.cookies.accessToken}`,
                'Content-Type':   req.headers['content-type'],
                'doctor-id':      doctorId
            },
            duplex: 'half',
            body: req
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error proxying profile photo upload:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── GET /doctor/register (Admin/SuperAdmin only) ──────────────────────────────
DoctorRoutes.get("/register", restrictTo(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        let hospitals = [];
        if (req.user.role === 'ADMIN') {
            const adminProfileInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/admin/displayAdminProfile`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
            });
            const adminProfileData = await adminProfileInfo.json();
            const hospitalGroupId = adminProfileData?.data?.hospitalGroupId;

            if (hospitalGroupId) {
                const hospitalsInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/hospital/groups/${hospitalGroupId}`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
                });
                const hospitalsData = await hospitalsInfo.json();
                hospitals = hospitalsData?.data || [];
            }
        } else {
            const hospitalsInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/hospital/`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
            });
            const hospitalsData = await hospitalsInfo.json();
            hospitals = hospitalsData?.data || [];
        }
        res.render("doctor/register", { hospitals, serverPort: process.env.SERVER_PORT, user: req.user });
    } catch (error) {
        console.error("Error loading doctor registration page:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while loading the doctor registration page."
        });
    }
});

// ── POST /doctor/register (Admin/SuperAdmin only) ─────────────────────────────
DoctorRoutes.post("/register", restrictTo(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error registering doctor:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── GET /doctor/patients/:patientId ───────────────────────────────────────────
DoctorRoutes.get("/patients/:patientId", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/patients/${req.params.patientId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${req.cookies.accessToken}` }
        });

        if (await checkBackendAccess(response, res)) return;

        const data = await response.json();
        const patientData = data?.response?.data || {};

        const mappedAppointments = (patientData.appointments || []).map(app => {
            return {
                ...app,
                type: app.type || (Number(app.id) % 2 === 0 ? 'ONLINE' : 'IN_PERSON'),
                meeting: app.meeting ? {
                    id: app.meeting.id.toString(),
                    link: app.meeting.joinUrl || app.meeting.link,
                    startUrl: app.meeting.startUrl,
                    status: app.meeting.status
                } : (mockMeetings[app.id] || null)
            };
        });

        res.render("doctor/patientProfile", {
            patient: patientData.patient,
            appointments: mappedAppointments,
            user: req.user
        });
    } catch (error) {
        console.error("Error fetching patient profile for doctor:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while loading the patient profile page."
        });
    }
});

// ── POST /doctor/appointments/:appointmentId/prescription-photo ───────────────
DoctorRoutes.post("/appointments/:appointmentId/prescription-photo", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/appointments/${req.params.appointmentId}/prescription-photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`,
                'Content-Type': req.headers['content-type']
            },
            duplex: 'half',
            body: req
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error uploading prescription photo:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── POST /doctor/appointments/:appointmentId/video-call ───────────────────────
// Starts or activates a Zoom meeting via the backend API
DoctorRoutes.post("/appointments/:appointmentId/video-call", checkToken, async (req, res) => {
    try {
        const appointmentId = req.params.appointmentId;
        
        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/meeting/${appointmentId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            mockMeetings[appointmentId] = {
                id: data.data.id,
                link: data.data.link,
                startUrl: data.data.startUrl,
                status: data.data.status,
                createdAt: new Date()
            };
            res.json({
                success: true,
                message: "Zoom meeting started successfully.",
                meeting: mockMeetings[appointmentId]
            });
        } else {
            console.error("Backend error starting video call:", data);
            res.status(response.status || 500).json({ success: false, message: data.message || "Failed to start Zoom call in backend" });
        }
    } catch (error) {
        console.error("Error starting video call:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── POST /doctor/appointments/:appointmentId/video-call/end ───────────────────
// Ends a Zoom meeting via the backend API
DoctorRoutes.post("/appointments/:appointmentId/video-call/end", checkToken, async (req, res) => {
    try {
        const appointmentId = req.params.appointmentId;
        
        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/meeting/${appointmentId}/end`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            if (mockMeetings[appointmentId]) {
                mockMeetings[appointmentId].status = 'COMPLETED';
            } else {
                mockMeetings[appointmentId] = {
                    id: data.data.id,
                    link: data.data.link,
                    startUrl: data.data.startUrl,
                    status: 'COMPLETED',
                    createdAt: new Date()
                };
            }
            res.json({
                success: true,
                message: "Zoom meeting ended successfully.",
                meeting: mockMeetings[appointmentId]
            });
        } else {
            console.error("Backend error ending video call:", data);
            res.status(response.status || 500).json({ success: false, message: data.message || "Failed to end Zoom call in backend" });
        }
    } catch (error) {
        console.error("Error ending video call:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── PATCH /doctor/appointments/:appointmentId/status ───────────────────────────
// Updates the status of an appointment via the backend API
DoctorRoutes.patch("/appointments/:appointmentId/status", checkToken, async (req, res) => {
    try {
        const appointmentId = req.params.appointmentId;
        const { status } = req.body;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/appointment/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            res.json({ success: true, message: "Status updated successfully." });
        } else {
            res.status(response.status || 500).json({ success: false, message: data.message || "Failed to update status." });
        }
    } catch (error) {
        console.error("Error updating appointment status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ── GET /doctor/earnings ──────────────────────────────────────────────────────
// Renders the doctor's earnings dashboard
DoctorRoutes.get("/earnings", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        // Fetch all invoices for the doctor
        const invoicesResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/invoice/doctor/${doctorId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`
            }
        });
        const invoicesData = await invoicesResponse.json();

        // Fetch all appointments for the doctor
        const appointmentsResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/appointments?page=1&limit=10000`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`
            }
        });
        const appointmentsData = await appointmentsResponse.json();

        // Fetch doctor profile to get consultation fees
        const profileResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`
            }
        });
        const profileData = await profileResponse.json();
        const doctor = profileData?.response?.data;
        const doctorFees = Number(doctor?.consultationFees || 1000);

        const monthsMap = {};
        let totalEarnings = 0;
        let totalTax = 0;
        let totalAmount = 0;

        const processedAppointmentIds = new Set();
        const formattedInvoices = [];

        // 1. Process database invoices
        (invoicesData.data || []).forEach(inv => {
            const isCompleted = inv.appointment && (
                inv.appointment.status === 'COMPLETED' ||
                (['BOOKED', 'ON_GOING', 'RESCHEDULED'].includes(inv.appointment.status) && new Date() > new Date(inv.appointment.appointmentEndTime))
            );

            if (!isCompleted) return;

            processedAppointmentIds.add(inv.appointmentId.toString());

            const date = new Date(inv.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            monthsMap[monthKey] = monthLabel;

            const fee = Number(inv.consultationFees || 0);
            const tax = Number(inv.taxCharges || 0);
            const tot = Number(inv.totalAmount || 0);

            totalEarnings += fee;
            totalTax += tax;
            totalAmount += tot;

            formattedInvoices.push({
                id: inv.id.toString(),
                date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                monthKey,
                patientName: inv.appointment?.patient ? `${inv.appointment.patient.firstName} ${inv.appointment.patient.lastName}` : 'N/A',
                consultationFees: fee.toFixed(2),
                taxCharges: tax.toFixed(2),
                totalAmount: tot.toFixed(2),
                paidBy: inv.paidBy || 'SELF'
            });
        });

        // 2. Process completed appointments that might not have a database billing record
        (appointmentsData?.response?.data?.appointments || []).forEach(app => {
            if (processedAppointmentIds.has(app.id.toString())) return;

            const isCompleted = app.status === 'COMPLETED' ||
                (['BOOKED', 'ON_GOING', 'RESCHEDULED'].includes(app.status) && new Date() > new Date(app.appointmentEndTime));

            if (!isCompleted) return;

            processedAppointmentIds.add(app.id.toString());

            const date = new Date(app.appointmentEndTime);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            monthsMap[monthKey] = monthLabel;

            const fee = Number(doctorFees);
            const tax = Number(fee * 0.18);
            const tot = Number(fee + tax);

            totalEarnings += fee;
            totalTax += tax;
            totalAmount += tot;

            const pFirstName = app.patient?.firstName || "Unknown";
            const pLastName  = app.patient?.lastName  || "Patient";

            formattedInvoices.push({
                id: `APT-${app.id}`,
                date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                monthKey,
                patientName: `${pFirstName} ${pLastName}`,
                consultationFees: fee.toFixed(2),
                taxCharges: tax.toFixed(2),
                totalAmount: tot.toFixed(2),
                paidBy: 'SELF'
            });
        });

        const months = Object.keys(monthsMap).sort().reverse().map(key => ({
            key,
            label: monthsMap[key]
        }));

        res.render("doctor/earnings", {
            invoices: formattedInvoices,
            months,
            totalEarnings: totalEarnings.toFixed(2),
            totalTax: totalTax.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            doctorId
        });
    } catch (error) {
        console.error("Error loading doctor earnings:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Error",
            message: "An error occurred while loading earnings."
        });
    }
});

// ── GET /doctor/earnings/invoice/:id ──────────────────────────────────────────
// Renders a beautiful individual print invoice for a specific transaction
DoctorRoutes.get("/earnings/invoice/:id", checkToken, async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;

        // Fetch doctor profile details for hospital branding
        const profileResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`
            }
        });
        const profileData = await profileResponse.json();
        const doctor = profileData?.response?.data;

        let invoice;

        if (invoiceId.startsWith("APT-")) {
            const appointmentId = invoiceId.substring(4);
            // Fetch appointment details by listing all appointments and finding the match
            const appointmentsResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/appointments?page=1&limit=10000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${req.cookies.accessToken}`
                }
            });
            const appointmentsData = await appointmentsResponse.json();
            const appointments = appointmentsData?.response?.data?.appointments || [];
            const app = appointments.find(a => a.id.toString() === appointmentId);

            if (!app) {
                return res.status(404).render("global/error", {
                    statusCode: 404,
                    title: "Appointment Not Found",
                    message: "The requested appointment could not be found."
                });
            }

            const isCompleted = app.status === 'COMPLETED' ||
                (['BOOKED', 'ON_GOING', 'RESCHEDULED'].includes(app.status) && new Date() > new Date(app.appointmentEndTime));

            if (!isCompleted) {
                return res.status(403).render("global/error", {
                    statusCode: 403,
                    title: "Access Denied",
                    message: "Invoice is not available because the appointment is not completed."
                });
            }

            const doctorFees = Number(doctor?.consultationFees || 1000);
            const pFirstName = app.patient?.firstName || "Unknown";
            const pLastName  = app.patient?.lastName  || "Patient";

            invoice = {
                id: `APT-${app.id}`,
                createdAt: new Date(app.appointmentEndTime).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
                consultationFees: doctorFees.toFixed(2),
                taxCharges: (doctorFees * 0.18).toFixed(2),
                taxRate: '18',
                totalAmount: (doctorFees * 1.18).toFixed(2),
                paidBy: 'SELF',
                doctorName: `Dr. ${doctor?.firstName || ''} ${doctor?.lastName || ''}`,
                patientName: `${pFirstName} ${pLastName}`,
                hospitalName: app.hospital?.branchName || 'N/A',
                hospitalAddress: app.hospital?.address || null,
                hospitalGroup: app.hospital?.hospitalGroup?.name || 'N/A'
            };
        } else {
            const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/invoice/${invoiceId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${req.cookies.accessToken}`
                }
            });
            
            const data = await response.json();
            if (!response.ok || !data.success || !data.data) {
                return res.status(404).render("global/error", {
                    statusCode: 404,
                    title: "Invoice Not Found",
                    message: "The requested invoice could not be found."
                });
            }

            const inv = data.data;

            // Security: ensure this doctor belongs to this invoice's appointment
            if (inv.appointment.doctorId.toString() !== doctorId.toString()) {
                return res.status(403).render("global/error", {
                    statusCode: 403,
                    title: "Access Denied",
                    message: "You are not authorized to view this invoice."
                });
            }

            const isCompleted = inv.appointment && (
                inv.appointment.status === 'COMPLETED' ||
                (['BOOKED', 'ON_GOING', 'RESCHEDULED'].includes(inv.appointment.status) && new Date() > new Date(inv.appointment.appointmentEndTime))
            );

            if (!isCompleted) {
                return res.status(403).render("global/error", {
                    statusCode: 403,
                    title: "Access Denied",
                    message: "Invoice is not available because the appointment is not completed."
                });
            }

            invoice = {
                id: inv.id.toString(),
                createdAt: new Date(inv.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
                consultationFees: Number(inv.consultationFees).toFixed(2),
                taxCharges: Number(inv.taxCharges).toFixed(2),
                taxRate: Number(inv.taxRate).toFixed(0),
                totalAmount: Number(inv.totalAmount).toFixed(2),
                paidBy: inv.paidBy,
                doctorName: `Dr. ${inv.appointment.doctor.firstName} ${inv.appointment.doctor.lastName}`,
                patientName: `${inv.appointment.patient.firstName} ${inv.appointment.patient.lastName}`,
                hospitalName: inv.appointment.hospital.branchName,
                hospitalAddress: inv.appointment.hospital.address,
                hospitalGroup: inv.appointment.hospital.hospitalGroup.name
            };
        }

        res.render("doctor/invoice", {
            invoice
        });
    } catch (error) {
        console.error("Error viewing invoice:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Error",
            message: "An error occurred while fetching the invoice."
        });
    }
});

// ── GET /doctor/earnings/download-monthly ────────────────────────────────────
// Renders a beautiful print breakdown of all transactions in a given month
DoctorRoutes.get("/earnings/download-monthly", checkToken, async (req, res) => {
    try {
        const doctorId = getDoctorId(req, res);
        if (!doctorId) return;
        const targetMonth = req.query.month;

        if (!targetMonth) {
            return res.status(400).render("global/error", {
                statusCode: 400,
                title: "Invalid Request",
                message: "A specific month must be selected."
            });
        }

        // Fetch all invoices for the doctor
        const invoicesResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/invoice/doctor/${doctorId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`
            }
        });
        const invoicesData = await invoicesResponse.json();

        // Fetch all appointments for the doctor
        const appointmentsResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/appointments?page=1&limit=10000`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`
            }
        });
        const appointmentsData = await appointmentsResponse.json();
        
        // Fetch doctor profile details for branding the statement
        const profileResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.accessToken}`
            }
        });
        const profileData = await profileResponse.json();
        const doctor = profileData?.response?.data;
        const doctorFees = Number(doctor?.consultationFees || 1000);

        let monthlyEarnings = 0;
        let monthlyTax = 0;
        let monthlyTotal = 0;

        const processedAppointmentIds = new Set();
        const filteredInvoices = [];

        // 1. Process database invoices
        (invoicesData.data || []).forEach(inv => {
            const date = new Date(inv.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const isCompleted = inv.appointment && (
                inv.appointment.status === 'COMPLETED' ||
                (['BOOKED', 'ON_GOING', 'RESCHEDULED'].includes(inv.appointment.status) && new Date() > new Date(inv.appointment.appointmentEndTime))
            );

            if (monthKey !== targetMonth || !isCompleted) return;

            processedAppointmentIds.add(inv.appointmentId.toString());

            const fee = Number(inv.consultationFees || 0);
            const tax = Number(inv.taxCharges || 0);
            const tot = Number(inv.totalAmount || 0);

            monthlyEarnings += fee;
            monthlyTax += tax;
            monthlyTotal += tot;

            filteredInvoices.push({
                id: inv.id.toString(),
                date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                patientName: inv.appointment?.patient ? `${inv.appointment.patient.firstName} ${inv.appointment.patient.lastName}` : 'N/A',
                consultationFees: fee.toFixed(2),
                taxCharges: tax.toFixed(2),
                totalAmount: tot.toFixed(2),
                paidBy: inv.paidBy || 'SELF'
            });
        });

        // 2. Process completed appointments that might not have a database billing record
        (appointmentsData?.response?.data?.appointments || []).forEach(app => {
            if (processedAppointmentIds.has(app.id.toString())) return;

            const date = new Date(app.appointmentEndTime);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            const isCompleted = app.status === 'COMPLETED' ||
                (['BOOKED', 'ON_GOING', 'RESCHEDULED'].includes(app.status) && new Date() > new Date(app.appointmentEndTime));

            if (monthKey !== targetMonth || !isCompleted) return;

            processedAppointmentIds.add(app.id.toString());

            const fee = Number(doctorFees);
            const tax = Number(fee * 0.18);
            const tot = Number(fee + tax);

            monthlyEarnings += fee;
            monthlyTax += tax;
            monthlyTotal += tot;

            const pFirstName = app.patient?.firstName || "Unknown";
            const pLastName  = app.patient?.lastName  || "Patient";

            filteredInvoices.push({
                id: `APT-${app.id}`,
                date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                patientName: `${pFirstName} ${pLastName}`,
                consultationFees: fee.toFixed(2),
                taxCharges: tax.toFixed(2),
                totalAmount: tot.toFixed(2),
                paidBy: 'SELF'
            });
        });

        const monthName = new Date(targetMonth + "-02").toLocaleString('default', { month: 'long', year: 'numeric' });

        res.render("doctor/monthlyInvoiceSummary", {
            monthLabel: monthName,
            doctorName: `Dr. ${doctor?.firstName || ''} ${doctor?.lastName || ''}`,
            hospitalName: doctor?.hospital?.branchName || 'N/A',
            invoices: filteredInvoices,
            totalEarnings: monthlyEarnings.toFixed(2),
            totalTax: monthlyTax.toFixed(2),
            totalAmount: monthlyTotal.toFixed(2)
        });
    } catch (error) {
        console.error("Error creating monthly invoice summary:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Error",
            message: "An error occurred while generating the monthly summary."
        });
    }
});

module.exports = DoctorRoutes;