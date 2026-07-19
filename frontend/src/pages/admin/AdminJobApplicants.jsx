import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

const UI = {
  page: 'min-h-screen bg-[#f8fafc]',
  container: 'mx-auto max-w-7xl px-1 py-8',
  card: 'w-full rounded-[22px] border border-[#e5e7eb] bg-white shadow-sm',
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2e66a6] focus-visible:ring-offset-2',
};

const SvgIcon = ({ name, className = 'h-4 w-4' }) => {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    strokeWidth: 1.8,
  };

  const icons = {
    arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />,
    users: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H2v-1a4 4 0 014-4h1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 8a4 4 0 11-8 0 4 4 0 018 0zM22 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] || null}</svg>;
};

const formatFullDate = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getApplicantName = (application) => {
  const user = application?.jobseeker || {};
  const name = [user.firstName, user.middleName, user.lastName, user.extensionName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');

  return name || user.fullName || 'Applicant';
};

const getApplicantEmail = (application) =>
  application?.jobseeker?.email || application?.email || 'N/A';

const getApplicantStatusMeta = (statusRaw) => {
  const status = String(statusRaw || '').trim().toLowerCase();

  if (status === 'hired') {
    return {
      label: 'Hired',
      className: 'border-green-200 bg-green-50 text-green-700',
    };
  }

  if (status === 'declined' || status === 'rejected') {
    return {
      label: status === 'rejected' ? 'Rejected' : 'Declined',
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  if (status === 'for interview') {
    return {
      label: 'For Interview',
      className: 'border-[#b9d0e8] bg-[#eef5fc] text-[#2e66a6]',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Pending',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending',
    className: 'border-gray-200 bg-gray-50 text-gray-700',
  };
};

const AdminJobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backPath = location.state?.backPath || `/admin/jobs/${jobId}`;
  const backLabel = location.state?.backLabel || 'Job Details';

  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [jobResponse, applicationsResponse] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/applications/job/${jobId}`),
      ]);

      setJob(jobResponse.data?.job || null);
      setApplicants(
        Array.isArray(applicationsResponse.data?.applications)
          ? applicationsResponse.data.applications
          : []
      );
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Job or applicant list not found.');
      } else if (err.request) {
        setError('Cannot connect to the server. Please check your connection.');
      } else {
        setError('Unable to load the applicant list right now.');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  return (
    <AdminLayout>
      <div className={UI.page}>
        <div className={UI.container}>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className={`mb-5 inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#eef5fc] hover:text-[#2e66a6] ${UI.ring}`}
          >
            <SvgIcon name="arrowLeft" className="h-4 w-4" />
            {backLabel}
          </button>

          <div className={`${UI.card} overflow-hidden`}>
            <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <SvgIcon name="users" className="h-5 w-5 text-[#4b5563]" />
                  <h1 className="text-lg font-bold text-[#111827]">Applicant List</h1>
                </div>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {job?.title || location.state?.jobTitle || 'Selected Job'}
                </p>
              </div>

              <span className="w-fit rounded-full border border-[#d7e6f5] bg-[#eef5fc] px-3 py-1 text-xs font-semibold text-[#2e66a6]">
                {applicants.length} {applicants.length === 1 ? 'Applicant' : 'Applicants'}
              </span>
            </div>

            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-[#6b7280]">
                Loading applicants...
              </div>
            ) : error ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-semibold text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={fetchApplicants}
                  className={`mt-4 rounded-lg border border-[#d7e6f5] bg-white px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#eef5fc] ${UI.ring}`}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">
                    <tr>
                      <th className="px-5 py-4">Applicant Name</th>
                      <th className="px-5 py-4">Email</th>
                      <th className="px-5 py-4">Date Applied</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#eef0f4] bg-white">
                    {applicants.length > 0 ? (
                      applicants.map((application) => {
                        const statusMeta = getApplicantStatusMeta(application.status);

                        return (
                          <tr
                            key={application._id}
                            className="text-[#374151] transition hover:bg-[#f8fafc]"
                          >
                            <td className="px-5 py-4 font-semibold text-[#111827]">
                              {getApplicantName(application)}
                            </td>
                            <td className="px-5 py-4">{getApplicantEmail(application)}</td>
                            <td className="px-5 py-4">
                              {formatFullDate(application.appliedAt || application.createdAt)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusMeta.className}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/admin/applications/${application._id}`, {
                                    state: {
                                      backPath: `/admin/jobs/${jobId}/applicants`,
                                      backLabel: 'Applicant List',
                                    },
                                  })
                                }
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#4b5563] transition hover:bg-[#eef5fc] hover:text-[#2e66a6] ${UI.ring}`}
                                title="View application"
                                aria-label="View application"
                              >
                                <SvgIcon name="eye" className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-5 py-14 text-center text-sm text-[#6b7280]">
                          No applicants yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminJobApplicants;
