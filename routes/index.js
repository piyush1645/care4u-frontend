const Router = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const DoctorRoutes = require('../modules/doctor/doctor.routes');
const patientRoutes = require('../modules/patient/patient.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const staffRoutes = require('../modules/staff/staff.routes');
const superAdminRoutes = require('../modules/superAdmin/superadmin.routes');

function setupRoutes(){
  // Importing route modules
  const Routes = Router();
  Routes.use("/auth" , authRoutes);
  Routes.use('/doctor', DoctorRoutes);
  Routes.use('/patient', patientRoutes);
  Routes.use('/admin', adminRoutes);
  Routes.use('/staff', staffRoutes);
  Routes.use('/superadmin', superAdminRoutes);

  // Additional route modules can be imported and set up here in a similar manner
  return Routes;
}

module.exports = setupRoutes;