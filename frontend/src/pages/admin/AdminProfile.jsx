import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Building2, CheckCircle2, Circle, Eye, EyeOff, LockKeyhole, Mail, Pencil, Phone, Upload, UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const DEFAULT_LOGO = "/images/phinma-logo.png";
const emptyProfile = {
  organizationName: "PHINMA Araullo University",
  organizationLogo: DEFAULT_LOGO,
  firstName: "",
  middleName: "",
  lastName: "",
  extensionName: "",
  positionRole: "System Administrator",
  email: "",
  contactNumber: "",
  departmentOffice: "",
};

const getFullName = (profile) =>
  [profile.firstName, profile.middleName, profile.lastName, profile.extensionName].filter(Boolean).join(" ") || "System Admin";

const AdminProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [draft, setDraft] = useState(emptyProfile);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [visible, setVisible] = useState({ currentPassword: false, newPassword: false, confirmNewPassword: false });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState("request");
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "", code: "" });
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const requirements = useMemo(() => [
    { label: "At least 8 characters", valid: passwords.newPassword.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(passwords.newPassword) },
    { label: "One lowercase letter", valid: /[a-z]/.test(passwords.newPassword) },
    { label: "At least one number", valid: /\d/.test(passwords.newPassword) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(passwords.newPassword) },
  ], [passwords.newPassword]);

  const updateStoredAdmin = (nextProfile) => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({
        ...stored,
        email: nextProfile.email,
        firstName: nextProfile.firstName,
        middleName: nextProfile.middleName,
        lastName: nextProfile.lastName,
        extensionName: nextProfile.extensionName,
        profileImage: nextProfile.organizationLogo,
      }));
      window.dispatchEvent(new Event("admin-profile-updated"));
    } catch (_) {
      // The API remains the source of truth if local storage is unavailable.
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/profile");
      const next = { ...emptyProfile, ...(response.data?.profile || {}) };
      setProfile(next);
      setDraft(next);
      updateStoredAdmin(next);
    } catch (error) {
      setNotice({ type: "error", message: error.response?.data?.message || "Unable to load the admin profile." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const openEditModal = () => {
    setDraft(profile);
    setLogoFile(null);
    setLogoPreview("");
    setNotice({ type: "", message: "" });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (saving) return;
    setShowEditModal(false);
    setLogoFile(null);
    setLogoPreview("");
  };

  const chooseLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setNotice({ type: "error", message: "Choose a JPG, PNG, GIF, or WEBP image up to 5MB." });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setNotice({ type: "", message: "" });
      const body = new FormData();
      ["organizationName", "firstName", "middleName", "lastName", "extensionName", "positionRole", "email", "contactNumber", "departmentOffice"]
        .forEach((key) => body.append(key, draft[key] || ""));
      if (logoFile) body.append("organizationLogo", logoFile);
      const response = await api.put("/admin/profile", body, { headers: { "Content-Type": "multipart/form-data" } });
      const next = { ...emptyProfile, ...(response.data?.profile || {}) };
      setProfile(next);
      setDraft(next);
      updateStoredAdmin(next);
      setShowEditModal(false);
      setNotice({ type: "success", message: response.data?.message || "Admin profile updated successfully." });
    } catch (error) {
      setNotice({ type: "error", message: error.response?.data?.message || "Unable to update the admin profile." });
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    try {
      setRemovingLogo(true);
      const response = await api.delete("/admin/profile/logo");
      const next = { ...emptyProfile, ...(response.data?.profile || {}) };
      setProfile(next);
      setDraft(next);
      setLogoFile(null);
      setLogoPreview("");
      updateStoredAdmin(next);
      setNotice({ type: "success", message: response.data?.message || "Organization logo removed." });
    } catch (error) {
      setNotice({ type: "error", message: error.response?.data?.message || "Unable to remove the logo." });
    } finally {
      setRemovingLogo(false);
    }
  };

  const openEmailModal = () => {
    setEmailStep("request");
    setEmailForm({ newEmail: "", currentPassword: "", code: "" });
    setPendingEmail("");
    setEmailError("");
    setEmailMessage("");
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    if (emailLoading) return;
    setShowEmailModal(false);
    setEmailError("");
    setEmailMessage("");
  };

  const requestEmailUpdate = async (event) => {
    event.preventDefault();
    const newEmail = emailForm.newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    try {
      setEmailLoading(true);
      setEmailError("");
      setEmailMessage("");
      const response = await api.post("/auth/settings/request-email-verification", {
        newEmail,
        currentPassword: emailForm.currentPassword,
      });
      setPendingEmail(response.data?.pendingEmail || newEmail);
      setEmailForm((previous) => ({ ...previous, code: "" }));
      setEmailStep("verify");
    } catch (error) {
      setEmailError(error.response?.data?.message || "Unable to send the verification code.");
    } finally {
      setEmailLoading(false);
    }
  };

  const verifyEmailUpdate = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(emailForm.code)) {
      setEmailError("Enter the 6-digit verification code sent to your new email.");
      return;
    }
    try {
      setEmailLoading(true);
      setEmailError("");
      setEmailMessage("");
      const response = await api.post("/auth/settings/verify-email", { code: emailForm.code });
      const verifiedEmail = response.data?.user?.email || pendingEmail;
      const next = { ...profile, email: verifiedEmail };
      setProfile(next);
      setDraft((previous) => ({ ...previous, email: verifiedEmail }));
      updateStoredAdmin(next);
      setShowEmailModal(false);
      setNotice({ type: "success", message: "Email updated successfully. Use this email for your next admin login and Forgot Password." });
    } catch (error) {
      setEmailError(error.response?.data?.message || "Unable to verify the email address.");
    } finally {
      setEmailLoading(false);
    }
  };

  const resendEmailCode = async () => {
    try {
      setEmailLoading(true);
      setEmailError("");
      setEmailMessage("");
      await api.post("/auth/settings/resend-email-verification");
      setEmailMessage("A new verification code was sent to your new email.");
    } catch (error) {
      setEmailError(error.response?.data?.message || "Unable to resend the verification code.");
    } finally {
      setEmailLoading(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    if (!requirements.every((item) => item.valid) || passwords.newPassword !== passwords.confirmNewPassword) {
      setNotice({ type: "error", message: "Check the password requirements and confirm your new password." });
      return;
    }
    try {
      setUpdatingPassword(true);
      setNotice({ type: "", message: "" });
      const response = await api.put("/admin/profile/password", passwords);
      setPasswords({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setNotice({ type: "success", message: response.data?.message || "Password updated successfully." });
    } catch (error) {
      setNotice({ type: "error", message: error.response?.data?.message || "Unable to update the password." });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const detailRows = [
    [UserRound, "Name", getFullName(profile)],
    [BriefcaseBusiness, "Role", profile.positionRole],
    [Mail, "Email", profile.email],
    [Phone, "Contact Number", profile.contactNumber || "Not provided"],
    [Building2, "Department Office", profile.departmentOffice || "Not provided"],
  ];

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-500">Loading admin profile...</div>;

  return (
    <div className="mx-auto max-w-7xl">
      <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
        <ArrowLeft size={17} /> Back
      </button>

      {notice.message && <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice.message}</div>}

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-center text-xs font-semibold text-slate-500">Organization Logo</p>
          <img src={profile.organizationLogo || DEFAULT_LOGO} alt="Organization logo" className="mx-auto mt-5 h-36 w-36 object-contain" onError={(event) => { event.currentTarget.src = DEFAULT_LOGO; }} />
          <h1 className="mt-6 text-center text-xl font-extrabold text-[#173b78]">{profile.organizationName}</h1>
          <div className="my-6 h-px bg-slate-200" />
          <div className="space-y-4">
            {detailRows.map(([Icon, label, value]) => <div key={label} className="grid grid-cols-[38px_130px_1fr] items-center gap-2 text-sm"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#173b78]"><Icon size={17} /></span><span className="font-medium text-slate-700">{label}:</span><span className="break-words text-slate-800">{value}</span></div>)}
          </div>
          <button type="button" onClick={openEditModal} className="mx-auto mt-8 flex items-center gap-2 rounded-lg border border-[#173b78]/40 px-5 py-2 text-sm font-semibold text-[#173b78] transition hover:bg-blue-50"><Pencil size={15} /> Edit Profile</button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#173b78]"><LockKeyhole size={20} /></span><h2 className="text-xl font-extrabold text-[#173b78]">Change Password</h2></div>
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/70 p-5"><p className="font-bold text-[#173b78]">Password Requirements</p><div className="mt-3 space-y-2">{requirements.map((item) => <p key={item.label} className={`flex items-center gap-2 text-sm font-medium transition-colors ${item.valid ? "text-emerald-700" : "text-slate-500"}`}>{item.valid ? <CheckCircle2 size={18} className="shrink-0 fill-emerald-600 text-white" aria-label="Requirement met" /> : <Circle size={18} className="shrink-0 text-slate-400" aria-label="Requirement not met" />}{item.label}</p>)}</div></div>
          <form onSubmit={updatePassword} className="mt-5 space-y-4">
            {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmNewPassword', 'Confirm New Password']].map(([name, label]) => <label key={name} className="block text-sm font-semibold text-slate-800">{label}:<span className="relative mt-2 block"><input required type={visible[name] ? "text" : "password"} value={passwords[name]} onChange={(event) => setPasswords((previous) => ({ ...previous, [name]: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 font-normal outline-none transition focus:border-[#173b78] focus:ring-2 focus:ring-blue-100" /><button type="button" onClick={() => setVisible((previous) => ({ ...previous, [name]: !previous[name] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label={`Show or hide ${label}`}>{visible[name] ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>)}
            <button disabled={updatingPassword} className="flex h-11 w-full items-center 
            justify-center gap-2 rounded-lg bg-[#173b78] text-sm font-bold text-white transition
             hover:bg-[#102d5e] disabled:opacity-60"><LockKeyhole size={16} />{updatingPassword ? "Updating..." : 
             "Update Password"}</button>
          </form>
        </section>
      </div>

      {showEditModal && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditModal(); }}><form onSubmit={saveProfile} className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between px-6 pb-3 pt-6"><div><h2 className="text-xl font-extrabold text-slate-900">Edit Profile</h2><p className="mt-1 text-sm text-slate-500">Update your organization branding and personal information.</p></div><button type="button" onClick={closeEditModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="max-h-[72vh] overflow-y-auto px-6 pb-6">
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><img src={logoPreview || draft.organizationLogo || DEFAULT_LOGO} alt="Logo preview" className="h-20 w-20 rounded-lg bg-white object-contain" /><input ref={fileInputRef} type="file" accept="image/*" onChange={chooseLogo} className="hidden" /><button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"><Upload size={16} /> Change logo</button><button type="button" onClick={removeLogo} disabled={removingLogo} className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-slate-500 disabled:opacity-60"><X size={16} />{removingLogo ? "Removing..." : "Remove"}</button></div>
        <div className="grid gap-4 sm:grid-cols-2">{[['organizationName','School / Organization Name','sm:col-span-2'],['firstName','First Name',''],['middleName','Middle Name',''],['lastName','Last Name',''],['extensionName','Suffix',''],['positionRole','Role','sm:col-span-2'],['email','Email','sm:col-span-2'],['contactNumber','Contact Number','sm:col-span-2'],['departmentOffice','Department Office','sm:col-span-2']].map(([name,label,span]) => <label key={name} className={`block text-sm font-semibold text-slate-800 ${span}`}>{label}{name === 'extensionName' ? <select value={draft.extensionName || ''} onChange={(event) => setDraft((previous) => ({ ...previous, extensionName: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal outline-none transition focus:border-[#173b78] focus:ring-2 focus:ring-blue-100"><option value="">None</option><option value="Jr.">Jr.</option><option value="Sr.">Sr.</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option><option value="V">V</option></select> : name === 'email' ? <span className="relative mt-2 block"><input readOnly aria-readonly="true" type="email" value={draft.email} className="h-11 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 pr-24 font-normal text-slate-500 outline-none" />
     </span> : <input required={['organizationName','firstName'
        ,'lastName','positionRole'].includes(name)} type="text" value={draft[name]} onChange={(event) => setDraft((previous) => ({ ...previous, [name]: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none transition focus:border-[#173b78] focus:ring-2 focus:ring-blue-100" />}</label>)}</div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeEditModal} className=
        "rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
        <button disabled={saving} className="rounded-lg bg-[#173b78] px-5 py-2.5 text-sm 
        font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button></div>
      </div></form></div>}

      {showEmailModal && <div className="fixed inset-0 z-[120] flex items-center 
      justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEmailModal(); }}><form onSubmit={emailStep === "request" ? requestEmailUpdate : verifyEmailUpdate} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold text-slate-900">{emailStep === "request" ? "Update Admin Email" : "Verify New Email"}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{emailStep === "request" ? "Your verified email will be used for admin login and Forgot Password." : `Enter the 6-digit code sent to ${pendingEmail}.`}</p></div><button type="button" onClick={closeEmailModal} disabled={emailLoading} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button></div>{emailError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{emailError}</div>}{emailMessage && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{emailMessage}</div>}{emailStep === "request" ? <div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-800">New Email Address<input autoFocus required type="email" value={emailForm.newEmail} onChange={(event) => setEmailForm((previous) => ({ ...previous, newEmail: event.target.value }))} placeholder="Enter your new email" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-[#173b78] focus:ring-2 focus:ring-blue-100" /></label><label className="block text-sm font-semibold text-slate-800">Current Password<input required type="password" value={emailForm.currentPassword} onChange={(event) => setEmailForm((previous) => ({ ...previous, currentPassword: event.target.value }))} placeholder="Confirm your current password" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-[#173b78] focus:ring-2 focus:ring-blue-100" /></label></div> : <div className="mt-5"><label className="block text-sm font-semibold text-slate-800">Verification Code<input autoFocus required inputMode="numeric" maxLength={6} value={emailForm.code} onChange={(event) => setEmailForm((previous) => ({ ...previous, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="000000" className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-center font-mono text-xl tracking-[0.35em] outline-none focus:border-[#173b78] focus:ring-2 focus:ring-blue-100" /></label><button type="button" onClick={resendEmailCode} disabled={emailLoading} className="mt-3 text-sm font-semibold text-[#173b78] hover:underline disabled:opacity-50">Resend verification code</button></div>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeEmailModal} disabled={emailLoading} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button disabled={emailLoading} className="rounded-lg bg-[#173b78] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#102d5e] disabled:opacity-60">{emailLoading ? "Please wait..." : emailStep === "request" ? "Send OTP" : "Verify & Update"}</button></div></form></div>}
    </div>
  );
};

export default AdminProfile;
