// src/pages/employer/auth/EmployerResubmitDocumentPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../services/api";

const docTypeLabels = {
  secRegistration: "SEC Registration",
  birRegistration: "BIR Registration",
  dtiRegistration: "DTI Registration",
  cityPermit: "City/Municipality Permit",
  businessPermit: "Business Permit",
};

const MAX_CREDENTIAL_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const validateCredentialFile = (file) => {
  if (!file) return "Please choose a file to upload.";
  if (file.size > MAX_CREDENTIAL_SIZE) return "File must not exceed 10MB.";

  const extension = `.${String(file.name || "").split(".").pop()?.toLowerCase() || ""}`;
  if (
    !ALLOWED_TYPES.has(String(file.type || "").toLowerCase()) ||
    ![".pdf", ".jpg", ".jpeg", ".png"].includes(extension)
  ) {
    return "Invalid file. Upload PDF, JPG, JPEG, or PNG only.";
  }

  return "";
};

const UploadIcon = () => (
  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M7 16a4 4 0 01-.88-7.903A5.5 5.5 0 0116.5 6.5a4.5 4.5 0 01.5 8.972M12 12v8m0-8-3 3m3-3 3 3"
    />
  </svg>
);

const EmployerResubmitDocumentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const inputRefs = useRef({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [docTypes, setDocTypes] = useState([]);
  const [reasonMessage, setReasonMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [dragActive, setDragActive] = useState({});

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Invalid resubmit link. Missing token.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await api.get("/auth/resubmit-document/validate", {
          params: { token },
        });

        if (res.data?.success && res.data?.accountType === "employer") {
          const requested = Array.isArray(res.data.docTypes) && res.data.docTypes.length
            ? res.data.docTypes
            : [res.data.docType].filter(Boolean);

          setTokenValid(true);
          setDocTypes(requested);
          setReasonMessage(res.data.reasonMessage || "");
        } else {
          setTokenValid(false);
          setError("This resubmit link is invalid or expired.");
        }
      } catch (e) {
        setTokenValid(false);
        setError(e.response?.data?.message || "This resubmit link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleFileSelected = (docType, file) => {
    if (!file) return;

    const validationMessage = validateCredentialFile(file);
    if (validationMessage) {
      setSelectedFiles((prev) => ({ ...prev, [docType]: null }));
      setError(`${docTypeLabels[docType] || docType}: ${validationMessage}`);
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [docType]: file }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async () => {
    if (!tokenValid) {
      setError("This resubmit link is invalid or expired.");
      return;
    }

    const missing = docTypes.filter((docType) => !selectedFiles[docType]);
    if (missing.length) {
      setError(
        `Please upload all requested documents: ${missing
          .map((docType) => docTypeLabels[docType] || docType)
          .join(", ")}.`,
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("token", token);

      docTypes.forEach((docType) => {
        formData.append(docType, selectedFiles[docType]);
      });

      const res = await api.post("/auth/resubmit-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        setSuccess(
          res.data?.message ||
            "Requested documents resubmitted successfully. Redirecting to login...",
        );
        setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              successMessage: "Your requested employer credentials were resubmitted successfully.",
            },
          });
        }, 1500);
      } else {
        setError("Failed to resubmit documents.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to resubmit documents.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[32px] bg-white border border-[#D9E2EC] p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#D9E2EC] border-t-[#2e66a6]" />
          <p className="mt-4 text-sm text-gray-600">Checking resubmit link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl rounded-[32px] border border-[#D9E2EC] bg-white p-6 sm:p-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F4F7FB] text-[#2e66a6]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 11V7a3 3 0 116 0v4m-8 0h10l1 10H6l1-10z" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-black">
            Resubmit Documents
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Upload the correct file for each business credential requested by the Admin.
          </p>
        </div>

        {reasonMessage ? (
          <div className="mt-6 rounded-2xl border border-[#F3D39A] bg-[#FFF7E9] px-5 py-4 text-[#8A5700]">
            <p className="text-sm font-semibold">Admin message</p>
            <p className="mt-1 text-sm leading-6">{reasonMessage}</p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {tokenValid ? (
          <div className="mt-6 space-y-4">
            {docTypes.map((docType, index) => {
              const file = selectedFiles[docType];
              const isActive = Boolean(dragActive[docType]);

              return (
                <div
                  key={docType}
                  className="rounded-2xl border border-[#D9E2EC] bg-white p-4 sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF4FB] text-sm font-bold text-[#2e66a6]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-black">
                        {docTypeLabels[docType] || docType}
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, JPG, JPEG or PNG · maximum 10MB
                      </p>
                    </div>
                  </div>

                  <input
                    ref={(node) => {
                      inputRefs.current[docType] = node;
                    }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) =>
                      handleFileSelected(docType, event.target.files?.[0])
                    }
                  />

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => inputRefs.current[docType]?.click()}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setDragActive((prev) => ({ ...prev, [docType]: true }));
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setDragActive((prev) => ({ ...prev, [docType]: false }));
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragActive((prev) => ({ ...prev, [docType]: false }));
                      handleFileSelected(docType, event.dataTransfer.files?.[0]);
                    }}
                    className={`mt-4 flex min-h-[130px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 transition ${
                      isActive
                        ? "border-[#2e66a6] bg-[#EEF4FB]"
                        : file
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2e66a6]"
                    }`}
                  >
                    <span className={file ? "text-emerald-600" : "text-gray-500"}>
                      <UploadIcon />
                    </span>
                    <span className="mt-2 text-sm font-semibold text-[#2e66a6]">
                      {file ? "Change File" : `Upload ${docTypeLabels[docType] || docType}`}
                    </span>
                    <span className="mt-1 max-w-full truncate text-xs text-gray-500">
                      {file ? file.name : "Click or drag and drop the correct credential here"}
                    </span>
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                !docTypes.length ||
                docTypes.some((docType) => !selectedFiles[docType])
              }
              className="mt-2 w-full rounded-xl bg-[#2e66a6] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#255587] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit All Documents"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default EmployerResubmitDocumentPage;
