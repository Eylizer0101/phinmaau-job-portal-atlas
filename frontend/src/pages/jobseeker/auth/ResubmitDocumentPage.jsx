// src/pages/jobseeker/auth/ResubmitDocumentPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../services/api";

const docTypeLabels = {
  validId: "Valid ID",
  cv: "CV / Resume",
  diploma: "Diploma",
  tor: "Transcript of Records",
  sss: "SSS ID/Number",
  philhealth: "PhilHealth ID",
  pagibig: "Pag-IBIG ID",
  tin: "TIN ID",
};

const MAX_CREDENTIAL_SIZE = 5 * 1024 * 1024;
const ALLOWED_CREDENTIAL_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const validateCredentialFile = async (file) => {
  if (!file) return "Please choose a file to upload.";
  if (file.size > MAX_CREDENTIAL_SIZE) {
    return "File must not exceed 5MB.";
  }

  const extension = `.${String(file.name || "").split(".").pop()?.toLowerCase() || ""}`;
  const allowedExtension = [".pdf", ".jpg", ".jpeg", ".png"].includes(extension);
  if (!ALLOWED_CREDENTIAL_TYPES.has(String(file.type || "").toLowerCase()) || !allowedExtension) {
    return "Invalid file. Upload PDF, JPG, JPEG, or PNG only, up to 5MB.";
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const startsWith = (...signature) => signature.every((value, index) => bytes[index] === value);

  if (extension === ".pdf") {
    const header = new TextDecoder("ascii").decode(bytes.slice(0, 5));
    const tail = new TextDecoder("latin1").decode(bytes.slice(Math.max(0, bytes.length - 2048)));
    if (header !== "%PDF-" || !tail.includes("%%EOF")) {
      return "The selected PDF is invalid or corrupted. Please choose a valid PDF file.";
    }
  } else if ([".jpg", ".jpeg"].includes(extension)) {
    if (!startsWith(0xff, 0xd8, 0xff)) {
      return "The selected image is invalid or corrupted. Please choose a valid JPG or JPEG file.";
    }
  } else if (
    extension === ".png" &&
    !startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
  ) {
    return "The selected image is invalid or corrupted. Please choose a valid PNG file.";
  }

  return "";
};

const ResubmitDocumentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tokenValid, setTokenValid] = useState(false);
  const [docType, setDocType] = useState("");
  const [reasonMessage, setReasonMessage] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

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

        const res = await api.get(`/auth/resubmit-document/validate`, {
          params: { token },
        });

        if (res.data?.success) {
          setTokenValid(true);
          setDocType(res.data.docType || "");
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

  const acceptedLabel = useMemo(() => {
    return docTypeLabels[docType] || docType || "document";
  }, [docType]);

  const handleChooseFile = () => {
    if (!tokenValid || submitting) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (file) => {
    if (!file) return;

    const validationMessage = await validateCredentialFile(file);
    if (validationMessage) {
      setSelectedFile(null);
      setError(validationMessage);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const onInputChange = async (e) => {
    const file = e.target.files?.[0];
    await handleFileSelected(file);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (submitting || !tokenValid) return;

    const file = e.dataTransfer.files?.[0];
    await handleFileSelected(file);
  };

  const handleSubmit = async () => {
    if (!tokenValid) {
      setError("This resubmit link is invalid or expired.");
      return;
    }

    if (!docType) {
      setError("Missing document type for resubmission.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose a file to upload.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("token", token);
      formData.append("docType", docType);
      formData.append("document", selectedFile);

      const res = await api.post(`/auth/resubmit-document`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        setSuccess(res.data?.message || "Document resubmitted successfully. Redirecting to login...");
        setTimeout(() => {
          navigate("/jobseeker/login", {
            replace: true,
            state: {
              successMessage: "Your document was resubmitted successfully.",
            },
          });
        }, 1500);
      } else {
        setError("Failed to resubmit document.");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to resubmit document.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[32px] bg-white border border-[#D9E2EC] shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-8 text-center">
          <div className="mx-auto h-10 w-10 border-4 border-[#D9E2EC] border-t-[#2e66a6] rounded-full animate-spin" />
          <p className="mt-4 text-sm text-black/70">Validating resubmit link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] rounded-[32px] bg-white border border-[#D9E2EC] shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 sm:p-8">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-[#F5F7FA] flex items-center justify-center">
            <svg className="w-7 h-7 text-[#2e66a6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 11c0-1.657 1.343-3 3-3h1V7a4 4 0 10-8 0v1h1c1.657 0 3 1.343 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 10h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8z" />
            </svg>
          </div>
        </div>

        <h1 className="mt-6 text-center text-3xl font-bold text-black">Resubmit Document</h1>

        {tokenValid ? (
          <>
            <div className="mt-6 rounded-2xl border border-[#F5D7A1] bg-[#FFF4E5] overflow-hidden">
              <div className="flex">
                <div className="w-1.5 bg-[#8A5A00]" />
                <div className="flex-1 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#8A5A00] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.66 18h16.68a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.74 0z" />
                    </svg>

                    <div className="text-sm text-[#6B4B00] leading-7">
                      <p className="font-semibold">Document to resubmit: {acceptedLabel}</p>
                      <p className="mt-1">{reasonMessage || "Please upload a clearer and valid document to continue."}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`mt-8 rounded-[24px] border-2 border-dashed px-6 py-10 text-center transition ${
                dragActive
                  ? "border-[#2e66a6] bg-[#EEF4FB]"
                  : "border-[#D9E2EC] bg-[#F8FAFD]"
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!submitting) setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!submitting) setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onInputChange}
                disabled={submitting}
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              />

              <div className="flex justify-center">
                <svg className="w-12 h-12 text-[#4B5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V8m0 0l-3 3m3-3l3 3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16.5A2.5 2.5 0 016.5 14H7a5 5 0 119.8 1.5H18a2 2 0 012 2v.5A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-1z" />
                </svg>
              </div>

              <p className="mt-4 text-base text-black/70">Drag and Drop</p>

              <button
                type="button"
                onClick={handleChooseFile}
                disabled={submitting}
                className="mt-2 text-xl font-bold text-[#0B57D0] hover:underline disabled:opacity-60"
              >
                Upload New Credentials
              </button>

              {selectedFile && (
                <p className="mt-4 text-sm text-black font-medium break-all">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-[#F3D1D1] bg-[#FDF2F2] px-4 py-3 text-sm font-medium text-[#7A271A]">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-2xl border border-[#C9DAF0] bg-[#EEF4FB] px-4 py-3 text-sm font-medium text-[#2e66a6]">
                {success}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !selectedFile}
                className="inline-flex items-center justify-center rounded-2xl bg-[#0B57D0] px-6 py-3 text-white text-xl font-bold hover:bg-[#0949AE] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-[#F3D1D1] bg-[#FDF2F2] px-4 py-4 text-sm font-medium text-[#7A271A]">
              {error || "This resubmit link is invalid, expired, or already used."}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => navigate("/jobseeker/login")}
                className="inline-flex items-center justify-center rounded-2xl bg-[#2e66a6] px-6 py-3 text-white text-sm font-semibold hover:bg-[#255587]"
              >
                Go to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResubmitDocumentPage;
