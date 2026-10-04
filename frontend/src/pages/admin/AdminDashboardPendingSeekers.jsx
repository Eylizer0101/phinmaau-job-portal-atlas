import React from "react";
import JobseekerVerification from "./JobseekerVerification";

const AdminDashboardPendingSeekers = () => (
  <JobseekerVerification defaultStatus="pending" pageTitle="Pending Job Seekers" showDashboardBack />
);

export default AdminDashboardPendingSeekers;
