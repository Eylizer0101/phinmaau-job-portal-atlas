// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ✅ MAIN LANDING PAGE
import MainLandingPage from './pages/main/MainLandingPage';

// ✅ NEW: Job Offers (public)
import JobOffers from './pages/main/JobOffers';

// ✅ NEW: Job Offer Details (public)
import JobOfferDetails from './pages/main/JobOfferDetails';

// ✅ NEW: Companies (public)
import Companies from './pages/main/Companies';

// ✅ NEW: Public Company Details
import CompanyDetails from './pages/main/CompanyDetails';

// ✅ NEW: Join As page
import JoinAsModal from './components/shared/JoinAsModal';

// ✅ NEW: reCAPTCHA runtime guard
import RecaptchaRuntimeGuard from './components/shared/RecaptchaRuntimeGuard';

// Job Seeker Pages
import LoginPage from './pages/jobseeker/auth/LoginPage';
import RegisterPage from './pages/jobseeker/auth/RegisterPage';
import ResetPassword from './pages/jobseeker/auth/ResetPassword';
import ResubmitDocumentPage from './pages/jobseeker/auth/ResubmitDocumentPage';
import JobSeekerDashboard from './pages/jobseeker/dashboard/JobSeekerDashboard';
import JobSearch from './pages/jobseeker/dashboard/JobSearch';
import MyProfile from './pages/jobseeker/dashboard/MyProfile';
import ResumePreviewPage from './pages/jobseeker/dashboard/ResumePreviewPage';
import JobDetails from './pages/jobseeker/dashboard/JobDetails';
import CompanyViewDetails from './pages/jobseeker/dashboard/CompanyViewDetails';
import CompanyAllReviews from './pages/jobseeker/dashboard/CompanyAllReviews';
import CompanyAllJobs from './pages/jobseeker/dashboard/CompanyAllJobs';
import JobseekerMessages from './pages/jobseeker/dashboard/JobseekerMessages';
import CommunityPage from './pages/jobseeker/dashboard/CommunityPage';
import MyApplications from './pages/jobseeker/dashboard/MyApplications';
import NotificationsPage from './pages/jobseeker/dashboard/NotificationsPage';
import JobSeekerSettings from './pages/jobseeker/dashboard/Settings';
import JobseekerCompanies from './pages/jobseeker/dashboard/JobseekerCompanies';
import Bookmarks from './pages/jobseeker/dashboard/Bookmarks';

// ✅ NEW: Employer resubmit page
import EmployerResubmitDocumentPage from './pages/employer/auth/EmployerResubmitDocumentPage';

// Employer Pages
import EmployerRegisterPage from './pages/employer/auth/EmployerRegisterPage';
import EmployerRegistrationPendingPage from './pages/employer/auth/EmployerRegistrationPendingPage';

import EmployerDashboard from './pages/employer/dashboard/EmployerDashboard';
import PostJob from './pages/employer/dashboard/PostJob';
import ManageJobs from './pages/employer/dashboard/ManageJobs';
import ArchivedJobs from './pages/employer/dashboard/ArchivedJobs';
import EditJob from './pages/employer/dashboard/EditJob';
import EmployerJobView from './pages/employer/dashboard/EmployerJobView';
import Applicants from './pages/employer/dashboard/Applicants';
import JobApplicants from './pages/employer/dashboard/JobApplicants';
import ApplicationDetails from './pages/employer/dashboard/ApplicationDetails';
import CompanyProfile from './pages/employer/dashboard/CompanyProfile';
import EmployerMessages from './pages/employer/dashboard/EmployerMessages';
import EmployerSettings from './pages/employer/dashboard/Settings';
import EmployerNotificationsPage from './pages/employer/dashboard/EmployerNotificationsPage';
import ForInterview from './pages/employer/dashboard/ForInterview';
import HiredApplicants from './pages/employer/dashboard/HiredApplicants';
import ArchivedDeclinedApplicants from './pages/employer/dashboard/ArchivedDeclinedApplicants';

// Layouts
import JobSeekerLayout from './layouts/JobSeekerLayout';

// ✅ ADMIN
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import UserManagementDetails from './pages/admin/UserManagementDetails';
import AdminUserApplicationHistory from './pages/admin/AdminUserApplicationHistory';
import AdminEmployerPostingHistory from './pages/admin/AdminEmployerPostingHistory';
import AdminEmployerReviews from './pages/admin/AdminEmployerReviews';
import AdminApplications from './pages/admin/AdminApplications';
import AdminApplicationView from './pages/admin/AdminApplicationView';
import AdminJobView from './pages/admin/AdminJobView';
import AdminJobApplicants from './pages/admin/AdminJobApplicants';
import AdminJobOffers from './pages/admin/AdminJobOffers';
import AdminArchive from './pages/admin/AdminArchive';
import AdminArchiveDetails from './pages/admin/AdminArchiveDetails';
import AdminSystemLogs from './pages/admin/AdminSystemLogs';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminEmployerJobEditRequests from './pages/admin/AdminEmployerJobEditRequests';
import AdminDashboardJobs from './pages/admin/AdminDashboardJobs';
import AdminDashboardJobSeekers from './pages/admin/AdminDashboardJobSeekers';
import AdminDashboardEmployers from './pages/admin/AdminDashboardEmployers';
import AdminDashboardPendingSeekers from './pages/admin/AdminDashboardPendingSeekers';
import AdminDashboardPendingEmployers from './pages/admin/AdminDashboardPendingEmployers';

// ✅ JOBSEEKER VERIFICATION
import JobseekerVerification from './pages/admin/JobseekerVerification';
import JobseekerVerificationDetails from './pages/admin/JobseekerVerificationDetails';

// ✅ EMPLOYER VERIFICATION
import EmployerVerification from './pages/admin/EmployerVerification';
import EmployerVerificationDetails from './pages/admin/EmployerVerificationDetails';

// CSS
import './index.css';

// ✅ Helper: safe get user
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

// ✅ Route guard component
const RequireRole = ({ role, redirectTo, children }) => {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token || !user) return <Navigate to={redirectTo} replace />;
  if (user.role !== role) return <Navigate to={redirectTo} replace />;

  return children;
};

function App() {
  return (
    <Router>
      <RecaptchaRuntimeGuard />

      <Routes>
        {/* ✅ MAIN LANDING ROUTE */}
        <Route path="/" element={<MainLandingPage />} />

        {/* ✅ NEW: PUBLIC JOB OFFERS */}
        <Route path="/jobs" element={<JobOffers />} />

        {/* ✅ NEW: PUBLIC JOB OFFER DETAILS */}
        <Route path="/jobs/:id" element={<JobOfferDetails />} />

        {/* ✅ NEW: PUBLIC COMPANIES */}
        <Route path="/companies" element={<Companies />} />

        {/* ✅ NEW: PUBLIC COMPANY DETAILS */}
        <Route path="/companies/:id" element={<CompanyDetails />} />

        {/* ✅ NEW: JOIN AS PAGE */}
        <Route path="/join-as" element={<JoinAsModal />} />

        {/* ✅ Job Seeker public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/jobseeker/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/resubmit-document" element={<ResubmitDocumentPage />} />

        {/* ✅ NEW: Employer public resubmit route */}
        <Route path="/employer/resubmit-document" element={<EmployerResubmitDocumentPage />} />

        {/* ✅ Jobseeker landing page REMOVED → redirect */}
        <Route path="/jobseeker" element={<Navigate to="/login" replace />} />

        {/* ✅ Employer login route now redirects to one login page */}
        <Route path="/employer/login" element={<Navigate to="/login" replace />} />

        {/* ✅ Employer landing page REMOVED → redirect */}
        <Route path="/employer" element={<Navigate to="/employer/register" replace />} />

        {/* ✅ Employer public routes */}
        <Route path="/employer/register" element={<EmployerRegisterPage />} />
        <Route path="/employer/register/pending" element={<EmployerRegistrationPendingPage />} />

        {/* ✅ Job Seeker Routes with Layout + Protection */}
        <Route
          path="/jobseeker/dashboard"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <JobSeekerDashboard />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/job-search"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <JobSearch />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/companies"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <JobseekerCompanies />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/company-details/:id"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <CompanyViewDetails />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/company-details/:id/reviews"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <CompanyAllReviews />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/company-details/:id/jobs"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <CompanyAllJobs />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/my-profile"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <MyProfile />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/my-profile/preview-resume"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <ResumePreviewPage />
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/my-applications"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <MyApplications />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/job-details/:id"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <JobDetails />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/bookmarks"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <Bookmarks />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/messages"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <JobseekerMessages />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/community"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <CommunityPage />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/notifications"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <NotificationsPage />
              </JobSeekerLayout>
            </RequireRole>
          }
        />
        <Route
          path="/jobseeker/settings"
          element={
            <RequireRole role="jobseeker" redirectTo="/login">
              <JobSeekerLayout>
                <JobSeekerSettings />
              </JobSeekerLayout>
            </RequireRole>
          }
        />

        {/* ✅ Employer protected routes */}
        <Route
          path="/employer/dashboard"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <EmployerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/employer/post-job"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <PostJob />
            </RequireRole>
          }
        />
        <Route
          path="/employer/manage-jobs"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <ManageJobs />
            </RequireRole>
          }
        />
        <Route
          path="/employer/manage-jobs/:jobId/view"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <EmployerJobView />
            </RequireRole>
          }
        />
        <Route
          path="/employer/manage-jobs/archived"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <ArchivedJobs />
            </RequireRole>
          }
        />
        <Route
          path="/employer/edit-job/:id"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <EditJob />
            </RequireRole>
          }
        />
        <Route
          path="/employer/applicants"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <Applicants />
            </RequireRole>
          }
        />
        <Route
          path="/employer/applicants/job/:jobId"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <Applicants />
            </RequireRole>
          }
        />
        <Route
          path="/employer/job/:jobId/applicants"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <JobApplicants />
            </RequireRole>
          }
        />
        <Route
          path="/employer/for-interview"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <ForInterview />
            </RequireRole>
          }
        />
        <Route
          path="/employer/hired"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <HiredApplicants />
            </RequireRole>
          }
        />
        <Route
          path="/employer/declined"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <Navigate to="/employer/hired?status=declined" replace />
            </RequireRole>
          }
        />
        <Route
          path="/employer/declined/archived"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <ArchivedDeclinedApplicants />
            </RequireRole>
          }
        />
        <Route
          path="/employer/application/:applicationId"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <ApplicationDetails />
            </RequireRole>
          }
        />
        <Route
          path="/employer/application/resume-preview"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <ResumePreviewPage />
            </RequireRole>
          }
        />
        <Route
          path="/employer/company-profile"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <CompanyProfile />
            </RequireRole>
          }
        />
        <Route
          path="/employer/messages"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <EmployerMessages />
            </RequireRole>
          }
        />
        <Route
          path="/employer/settings"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <EmployerSettings />
            </RequireRole>
          }
        />

        <Route
          path="/employer/notifications"
          element={
            <RequireRole role="employer" redirectTo="/login">
              <EmployerNotificationsPage />
            </RequireRole>
          }
        />

        {/* ✅ ADMIN ROUTES */}
        <Route
          path="/admin"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </RequireRole>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminLayout>
                <AdminNotificationsPage />
              </AdminLayout>
            </RequireRole>
          }
        />

        <Route
          path="/admin/employer-job-edit-requests"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminLayout>
                <AdminEmployerJobEditRequests />
              </AdminLayout>
            </RequireRole>
          }
        />

        <Route
          path="/admin/dashboard/jobs"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminDashboardJobs />
            </RequireRole>
          }
        />
        <Route
          path="/admin/dashboard/job-seekers"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminDashboardJobSeekers />
            </RequireRole>
          }
        />
        <Route
          path="/admin/dashboard/employers"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminDashboardEmployers />
            </RequireRole>
          }
        />
        <Route
          path="/admin/dashboard/pending-seekers"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminDashboardPendingSeekers />
            </RequireRole>
          }
        />
        <Route
          path="/admin/dashboard/pending-employers"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminDashboardPendingEmployers />
            </RequireRole>
          }
        />

        <Route
          path="/admin/users"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <UserManagement />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <UserManagementDetails />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/:userId/application-history"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminUserApplicationHistory />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/:userId/resume-preview"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <ResumePreviewPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/:userId/posting-history"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminEmployerPostingHistory />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users/:userId/reviews"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminEmployerReviews />
            </RequireRole>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminApplications />
            </RequireRole>
          }
        />

        <Route
          path="/admin/applications/:applicationId"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminApplicationView />
            </RequireRole>
          }
        />

        <Route
          path="/admin/job-offers"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminJobOffers />
            </RequireRole>
          }
        />
        <Route
          path="/admin/jobs/:jobId"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminJobView />
            </RequireRole>
          }
        />
        <Route
          path="/admin/jobs/:jobId/applicants"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminJobApplicants />
            </RequireRole>
          }
        />

        <Route
          path="/admin/archive"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminArchive />
            </RequireRole>
          }
        />
        <Route
          path="/admin/archive/:type/:id"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminArchiveDetails />
            </RequireRole>
          }
        />
        <Route
          path="/admin/system-logs"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <AdminSystemLogs />
            </RequireRole>
          }
        />

        {/* ✅ JOBSEEKER VERIFICATION ROUTES */}
        <Route
          path="/admin/jobseeker-verification"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <JobseekerVerification />
            </RequireRole>
          }
        />
        <Route
          path="/admin/jobseeker-verification/:id"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <JobseekerVerificationDetails />
            </RequireRole>
          }
        />

        {/* ✅ EMPLOYER VERIFICATION ROUTES */}
        <Route
          path="/admin/employer-verification"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <EmployerVerification />
            </RequireRole>
          }
        />
        <Route
          path="/admin/employer-verification/:employerId"
          element={
            <RequireRole role="admin" redirectTo="/login">
              <EmployerVerificationDetails />
            </RequireRole>
          }
        />

        {/* ✅ Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
