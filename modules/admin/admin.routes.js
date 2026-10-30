const Router = require('express');
const checkToken = require('../../middleware/auth.middleware');
const adminRoutes = Router();

adminRoutes.use(checkToken);
adminRoutes.use(checkToken.roleGuard(['ADMIN']));


adminRoutes.get("/dashboard", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId;
        if (!adminId) {
            return res.status(401).render("global/error", { title: "Unauthorized", statusCode: 401, message: "You are not authorized to view this page." });
        }

        const searchString = typeof req.query.searchString == "string" ? req.query.searchString : ""

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/admin/adminDashboard?searchString=${encodeURIComponent(searchString)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        })

        const result = await response.json()

        if (!response.ok) {
            throw new Error(result.message)
        } else {
            res.render("admin/dashboard", {
                data: result.data,
                searchString
            })
        }

    } catch (error) {
        console.error("Error fetching Admin dashboard:", error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching Admin dashboard." });
    }
})

adminRoutes.get("/doctors", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId;

        if (!adminId) {
            return res.status(401).render("global/error", {
                title: "Unauthorized",
                statusCode: 401,
                message: "You are not authorized to view this page."
            });
        }

        const searchString =
            typeof req.query.searchString === "string"
                ? req.query.searchString
                : "";

        const response = await fetch(
            `http://localhost:3004/api/v1/admin/getDoctorsDetail?searchString=${encodeURIComponent(searchString)}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${req.cookies.accessToken}`,
                },
            }
        );

        const countResponse = await fetch(
            `http://localhost:${process.env.SERVER_PORT}/api/v1/admin/adminDashboard`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${req.cookies.accessToken}`,
                },
            }
        );

        const result = await response.json();
        const counts = await countResponse.json();

        res.render("admin/doctor/list", {
            data: result.data,
            counts: counts.data,
            searchString,
        });
    } catch (error) {
        console.log(error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching Doctor details." });
    }
});

adminRoutes.get("/doctorProfile", checkToken, async (req, res) => {
    try {
        const doctorId = req.query.doctorId
        if (!doctorId) return;

        const [profileInfo, leavesInfo] = await Promise.all([
            fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${req.cookies.accessToken}`
                }
            }),
            fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/leaves`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${req.cookies.accessToken}`
                }
            })
        ]);

        if (profileInfo.status === 401 || leavesInfo.status === 401) {
            return res.redirect('/auth/login');
        }
        if (profileInfo.status === 403 || leavesInfo.status === 403) {
            return res.status(403).render("global/error", { title: "Forbidden", statusCode: 403, message: "You are not authorized to view this doctor's profile." });
        }

        const profileData = await profileInfo.json();
        const leavesData = await leavesInfo.json();

        const doctor = profileData?.response?.data || {};
        const upcomingLeaves = leavesData?.response?.data || [];

        res.render("admin/doctor/profile", { doctor, upcomingLeaves, serverPort: process.env.SERVER_PORT });
    } catch (error) {
        console.error("Error fetching doctor profile:", error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching Doctor profile." });
    }
})

adminRoutes.get("/doctorProfile/edit", checkToken, async (req, res) => {
    try {
        const doctorId = req.query.doctorId
        if (!doctorId) return;

        const profileInfo = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${doctorId}/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });

        if (profileInfo.status === 401) {
            return res.redirect('/auth/login');
        }
        if (profileInfo.status === 403) {
            return res.status(403).render("global/error", { title: "Forbidden", statusCode: 403, message: "You are not authorized to edit this doctor's profile." });
        }

        const profileData = await profileInfo.json();
        const doctor = profileData?.response?.data || {};

        res.render("admin/doctor/editProfile", { doctor, serverPort: process.env.SERVER_PORT });
    } catch (error) {
        console.error("Error fetching doctor profile for edit:", error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching doctor profile for edit." });
    }
})

adminRoutes.post("/doctorProfile/edit", checkToken, async (req, res) => {
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
        console.log(data);
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error updating doctor profile:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

adminRoutes.get("/staffProfile", checkToken, async (req, res) => {
    try {
        const staffId = req.query.staffId;
        if (!staffId) {
            return res.status(400).render("global/error", { title: "Bad Request", statusCode: 400, message: "Staff ID is required." });
        }

        const resolveGroupResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/resolve-hospital-group`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const resolveResult = await resolveGroupResponse.json();
        if (!resolveGroupResponse.ok || !resolveResult.success) {
            throw new Error(resolveResult.message || "Failed to resolve hospital group");
        }
        const hospitalGroupId = resolveResult.data.hospitalGroupId;

        const staffResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/${staffId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });

        if (staffResponse.status === 401) {
            return res.redirect('/auth/login');
        }
        if (staffResponse.status === 403) {
            return res.status(403).render("global/error", { title: "Forbidden", statusCode: 403, message: "You are not authorized to view this staff profile." });
        }

        const staffResult = await staffResponse.json();
        if (!staffResponse.ok || !staffResult.success) {
            return res.status(staffResponse.status).render("global/error", {
                title: "Not Found",
                statusCode: staffResponse.status,
                message: staffResult.message || "Staff not found."
            });
        }

        const staff = staffResult.data;

        res.render("admin/staff/profile", { staff, serverPort: process.env.SERVER_PORT });
    } catch (error) {
        console.error("Error fetching staff profile:", error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching staff profile." });
    }
});

adminRoutes.get("/staffProfile/edit", checkToken, async (req, res) => {
    try {
        const staffId = req.query.staffId;
        if (!staffId) {
            return res.status(400).render("global/error", { title: "Bad Request", statusCode: 400, message: "Staff ID is required." });
        }

        const resolveGroupResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/resolve-hospital-group`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const resolveResult = await resolveGroupResponse.json();
        if (!resolveGroupResponse.ok || !resolveResult.success) {
            throw new Error(resolveResult.message || "Failed to resolve hospital group");
        }
        const hospitalGroupId = resolveResult.data.hospitalGroupId;

        const staffResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/${staffId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });

        if (staffResponse.status === 401) {
            return res.redirect('/auth/login');
        }
        if (staffResponse.status === 403) {
            return res.status(403).render("global/error", { title: "Forbidden", statusCode: 403, message: "You are not authorized to edit this staff profile." });
        }

        const staffResult = await staffResponse.json();
        if (!staffResponse.ok || !staffResult.success) {
            return res.status(staffResponse.status).render("global/error", {
                title: "Not Found",
                statusCode: staffResponse.status,
                message: staffResult.message || "Staff not found."
            });
        }

        const staff = staffResult.data;

        const hospitalsResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/hospitals`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const hospitalsResult = await hospitalsResponse.json();
        const hospitals = hospitalsResult.data || [];

        res.render("admin/staff/editProfile", { staff, hospitals, serverPort: process.env.SERVER_PORT });
    } catch (error) {
        console.error("Error fetching staff profile for edit:", error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching staff profile for edit." });
    }
});

adminRoutes.post("/staffProfile/edit", checkToken, async (req, res) => {
    try {
        const staffId = req.query.staffId;
        if (!staffId) {
            return res.status(400).json({ success: false, message: "Staff ID is required." });
        }

        const resolveGroupResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/resolve-hospital-group`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const resolveResult = await resolveGroupResponse.json();
        if (!resolveGroupResponse.ok || !resolveResult.success) {
            return res.status(resolveGroupResponse.status).json(resolveResult);
        }
        const hospitalGroupId = resolveResult.data.hospitalGroupId;

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/${staffId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Error updating staff profile:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

adminRoutes.get("/staff", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId;
        if (!adminId) {
            return res.status(401).render("global/error", { title: "Unauthorized", statusCode: 401, message: "You are not authorized to view this page." });
        }

        const searchString = typeof req.query.searchString === "string" ? req.query.searchString : "";

        // 1. Resolve hospital group id for the logged-in admin
        const resolveGroupResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/resolve-hospital-group`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const resolveResult = await resolveGroupResponse.json();
        if (!resolveGroupResponse.ok || !resolveResult.success) {
            throw new Error(resolveResult.message || "Failed to resolve hospital group");
        }
        const hospitalGroupId = resolveResult.data.hospitalGroupId;

        // 2. Fetch staff in the hospital group
        const staffResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const staffResult = await staffResponse.json();
        if (!staffResponse.ok) {
            throw new Error(staffResult.message || "Failed to fetch staff members");
        }

        // 3. Fetch hospital branches in this hospital group
        const hospitalsResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/hospitals`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const hospitalsResult = await hospitalsResponse.json();
        const hospitals = hospitalsResult.data || [];

        // 4. Fetch dashboard counts
        const countResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/admin/adminDashboard`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const counts = await countResponse.json();

        let staffList = staffResult.data || [];
        if (searchString) {
            const query = searchString.toLowerCase();
            staffList = staffList.filter(s => 
                (s.firstName && s.firstName.toLowerCase().includes(query)) ||
                (s.lastName && s.lastName.toLowerCase().includes(query)) ||
                (s.credential && s.credential.email && s.credential.email.toLowerCase().includes(query)) ||
                (s.credential && s.credential.mobile && s.credential.mobile.toLowerCase().includes(query))
            );
        }

        res.render("admin/staff", {
            data: staffList,
            counts: counts.data,
            hospitals,
            searchString
        });
    } catch (error) {
        console.error("Error fetching staff details:", error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching Staff details." });
    }
});

adminRoutes.get("/staff/register", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId;
        if (!adminId) {
            return res.status(401).render("global/error", { title: "Unauthorized", statusCode: 401, message: "You are not authorized to view this page." });
        }

        const resolveGroupResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/resolve-hospital-group`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const resolveResult = await resolveGroupResponse.json();
        if (!resolveGroupResponse.ok || !resolveResult.success) {
            throw new Error(resolveResult.message || "Failed to resolve hospital group");
        }
        const hospitalGroupId = resolveResult.data.hospitalGroupId;

        const hospitalsResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/hospitals`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const hospitalsResult = await hospitalsResponse.json();
        const hospitals = hospitalsResult.data || [];

        res.render("admin/staff/register", { hospitals, user: req.user });
    } catch (error) {
        console.error("Error loading staff registration page:", error);
        res.status(500).render("global/error", {
            statusCode: 500,
            title: "Internal Server Error",
            message: "An unexpected error occurred while loading the staff registration page."
        });
    }
});

adminRoutes.post("/staff/register", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // 1. Resolve hospital group id for the logged-in admin
        const resolveGroupResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/resolve-hospital-group`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const resolveResult = await resolveGroupResponse.json();
        if (!resolveGroupResponse.ok || !resolveResult.success) {
            return res.status(resolveGroupResponse.status).json(resolveResult);
        }
        const hospitalGroupId = resolveResult.data.hospitalGroupId;

        // 2. Register staff
        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/register`, {
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
        console.error("Error registering staff:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

adminRoutes.patch("/staff/:staffId/deactivate", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { staffId } = req.params;

        // 1. Resolve hospital group id for the logged-in admin
        const resolveGroupResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/resolve-hospital-group`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });
        const resolveResult = await resolveGroupResponse.json();
        if (!resolveGroupResponse.ok || !resolveResult.success) {
            return res.status(resolveGroupResponse.status).json(resolveResult);
        }
        const hospitalGroupId = resolveResult.data.hospitalGroupId;

        // 2. Deactivate staff
        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/staff/hospital-group/${hospitalGroupId}/deactivate/${staffId}`, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });

        const result = await response.json();
        return res.status(response.status).json(result);
    } catch (error) {
        console.error("Error deactivating staff in proxy:", error);
        return res.status(500).json({ success: false, message: "Internal server error during staff deactivation" });
    }
});

adminRoutes.get("/hospitals", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId
        if (!adminId) {
            return res.status(401).render("global/error", { title: "Unauthorized", statusCode: 401, message: "You are not authorized to view this page." });
        }

        const hospitalGroupIdResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/admin/getAdminHospitalGroupId`, {
            method: 'Get',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        })

        const hospitalGroupId = await hospitalGroupIdResponse.json()

        const getHospitalDetailsResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/hospital/groups/${hospitalGroupId.data.hospitalGroupId}`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        })
        const hospitalDetails = await getHospitalDetailsResponse.json()

        res.render("admin/hospitals", { data: hospitalDetails.data })
    } catch (error) {
        console.log(error)
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching Hospital/Group details." });
    }

})

adminRoutes.get("/hospitals/:hospitalId", checkToken, async (req, res) => {
    try {
        const adminId = req.user.userId;
        if (!adminId) {
            return res.status(401).render("global/error", { title: "Unauthorized", statusCode: 401, message: "You are not authorized to view this page." });
        }

        const { hospitalId } = req.params;

        const detailResponse = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/hospital/${hospitalId}/detail`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });

        const detailResult = await detailResponse.json();

        if (!detailResponse.ok || !detailResult.success) {
            return res.status(detailResponse.status).render("global/error", {
                title: "Not Found",
                statusCode: detailResponse.status,
                message: detailResult.message || "Hospital not found."
            });
        }

        res.render("admin/hospital-detail", { data: detailResult.data });
    } catch (error) {
        console.error("Error fetching hospital detail:", error);
        res.status(500).render("global/error", { title: "Internal Server Error", statusCode: 500, message: "Error fetching hospital details." });
    }
})



adminRoutes.patch("/doctors/:credentialId/status", checkToken, async (req, res) => {
    try {
        const { credentialId } = req.params;
        const { action } = req.body; // 'active' or 'deactive'

        const response = await fetch(`http://localhost:${process.env.SERVER_PORT}/api/v1/doctor/${credentialId}/${action}`, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.cookies.accessToken}`
            }
        });

        const result = await response.json();
        return res.status(response.status).json(result);
    } catch (error) {
        console.error("Error toggling doctor status in proxy:", error);
        return res.status(500).json({ success: false, message: "Internal server error during doctor status toggle" });
    }
});

module.exports = adminRoutes;