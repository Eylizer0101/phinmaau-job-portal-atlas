// src/layouts/EmployerLayout.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";
import api from "../services/api";

const VERIFY_MODAL_SEEN_KEY = "employerVerifyModalSeen"; // session flag

const EmployerLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({
    Jobs: true,
    Applications: true,
  });

  // ✅ Logout modal state (QA/UI confirm)
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false); // for smooth animation

  // 🔎 verification state for popup
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isVerifyModalVisible, setIsVerifyModalVisible] = useState(false); // for smooth animation
  const [hasCheckedVerification, setHasCheckedVerification] = useState(false);

  // ✅ ROLE GUARD (prevents jobseeker/admin token from entering employer layout)
  useEffect(() => {
    const token = localStorage.getItem("token");
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      user = null;
    }

    if (!token || !user) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/employer/login", { replace: true });
      return;
    }

    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    if (user.role !== "employer") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/employer/login", { replace: true });
    }
  }, [navigate]);

  // ✅ Check verification status - with improved timing
  const checkVerificationStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/auth/me");
      const user = res.data?.user;

      // ✅ BACKEND overallStatus values:
      // unverified | pending | verified | rejected
      const v =
        user?.employerProfile?.verificationDocs?.overallStatus || "unverified";

      setVerificationStatus(v);

      const s = String(v || "").trim().toLowerCase();
      const alreadySeen = sessionStorage.getItem(VERIFY_MODAL_SEEN_KEY);

      // ✅ QA rule (FINAL):
      // - Show popup ONLY if UNVERIFIED or REJECTED
      // - Do NOT show if PENDING (already uploaded) or VERIFIED
      // - Show once per session only
      if ((s === "unverified" || s === "rejected") && !alreadySeen) {
        setTimeout(() => {
          setShowVerifyModal(true);
        }, 700); // ⏱ ~0.7s delay bago lumitaw
      }
    } catch (err) {
      console.error("Error checking employer verification:", err);
    } finally {
      setHasCheckedVerification(true);
    }
  };

  // ✅ Check verification on mount
  useEffect(() => {
    checkVerificationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Also check when coming from login page
  useEffect(() => {
    if (location.state?.justLoggedIn && !hasCheckedVerification) {
      checkVerificationStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, hasCheckedVerification]);

  // ✅ smooth fade/scale in animation for popup
  useEffect(() => {
    if (showVerifyModal) {
      setIsVerifyModalVisible(false);
      const t = setTimeout(() => {
        setIsVerifyModalVisible(true);
      }, 50); // maliit lang para mag-trigger yung transition
      return () => clearTimeout(t);
    } else {
      setIsVerifyModalVisible(false);
    }
  }, [showVerifyModal]);

  // ✅ smooth fade/scale in animation for logout modal
  useEffect(() => {
    if (showLogoutModal) {
      setIsLogoutModalVisible(false);
      const t = setTimeout(() => setIsLogoutModalVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setIsLogoutModalVisible(false);
    }
  }, [showLogoutModal]);

  // ✅ logout timer cleanup (para smooth at walang bigla)
  const logoutTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, []);

  // A11y refs for focus management (mobile drawer)
  const drawerRef = useRef(null);
  const openBtnRef = useRef(null);
  const closeBtnRef = useRef(null);
  const lastFocusRef = useRef(null);

  const layoutVars = {
    "--sidebar-w": "16rem",
    "--sidebar-gutter": "1rem",
  };

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2";

  // ✅ Verify modal a11y + focus management
  const verifyDialogRef = useRef(null);
  const verifyCloseBtnRef = useRef(null);
  const verifyPrimaryBtnRef = useRef(null);
  const lastFocusBeforeVerifyRef = useRef(null);

  const closeVerifyModal = () => {
    sessionStorage.setItem(VERIFY_MODAL_SEEN_KEY, "1");
    setShowVerifyModal(false);
  };

  // ✅ Logout modal a11y + focus management
  const logoutDialogRef = useRef(null);
  const logoutCancelBtnRef = useRef(null);
  const logoutPrimaryBtnRef = useRef(null);
  const lastFocusBeforeLogoutRef = useRef(null);

  const closeLogoutModal = () => {
    if (isLoggingOut) return;

    // ✅ smooth close (fade out first, then unmount)
    setIsLogoutModalVisible(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      setShowLogoutModal(false);
    }, 220);
  };

  const openLogoutModal = () => {
    if (isLoggingOut) return;
    setShowLogoutModal(true);
  };

  const statusMeta = useMemo(() => {
    const s = String(verificationStatus || "").trim().toLowerCase();
    if (s === "rejected") {
      return {
        label: "Rejected",
        chip: "bg-red-50 text-red-700 ring-1 ring-red-200",
        helper: "Your documents were rejected. Please upload again.",
      };
    }
    if (s === "unverified" || !s) {
      return {
        label: "Unverified",
        chip: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
        helper: "Upload documents to verify your employer account.",
      };
    }
    if (s === "pending") {
      return {
        label: "Pending",
        chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        helper: "We received your documents. Please wait for review.",
      };
    }
    return {
      label: "Verified",
      chip: "bg-green-50 text-green-700 ring-1 ring-green-200",
      helper: "Your account is verified.",
    };
  }, [verificationStatus]);

  // ✅ Lock scroll + focus trap + ESC close for verify modal
  useEffect(() => {
    if (!showVerifyModal) return;

    // Save last focused element
    lastFocusBeforeVerifyRef.current = document.activeElement;

    // Lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus: close button first (or primary)
    setTimeout(() => {
      (verifyCloseBtnRef.current || verifyPrimaryBtnRef.current)?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeVerifyModal();
        return;
      }
      if (e.key !== "Tab") return;

      const root = verifyDialogRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;

      // Restore focus
      const el = lastFocusBeforeVerifyRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [showVerifyModal]);

  // ✅ Lock scroll + focus trap + ESC close for logout modal
  useEffect(() => {
    if (!showLogoutModal) return;

    lastFocusBeforeLogoutRef.current = document.activeElement;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      (logoutCancelBtnRef.current || logoutPrimaryBtnRef.current)?.focus?.();
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLogoutModal();
        return;
      }
      if (e.key !== "Tab") return;

      const root = logoutDialogRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;

      const el = lastFocusBeforeLogoutRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [showLogoutModal, isLoggingOut]);

  const navSections = useMemo(
    () => [
      {
        type: "item",
        name: "Dashboard",
        path: "/employer/dashboard",
        icon:
          "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
      {
        type: "dropdown",
        name: "Jobs",
        icon:
          "M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z",
        items: [
          {
            name: "Post Job",
            path: "/employer/post-job",
            icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
          },
          {
            name: "Manage Jobs",
            path: "/employer/manage-jobs",
            icon:
              "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
          },
          {
            name: "Applicants",
            path: "/employer/applicants",
            icon:
              "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0h-.01",
          },
          {
            name: "For Interview",
            path: "/employer/for-interview",
            icon:
              "M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z",
          },
        ],
      },
      {
        type: "dropdown",
        name: "Applications",
        icon:
          "M9 12h6m-6 4h6M9 8h6m2 13H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z",
        items: [
          {
            name: "Hired",
            path: "/employer/hired",
            icon:
              "M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z",
          },
          {
            name: "Declined",
            path: "/employer/declined",
            icon: "M6 18L18 6M6 6l12 12",
          },
        ],
      },
      {
        type: "item",
        name: "Messages",
        path: "/employer/messages",
        icon:
          "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 002-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
      },
    ],
    []
  );

  const currentLabel = useMemo(() => {
    const all = navSections.flatMap((section) =>
      section.type === "dropdown" ? section.items : [section]
    );
    const match = all
      .filter((item) => location.pathname.startsWith(item.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match?.name || "Dashboard";
  }, [location.pathname, navSections]);

  // Close mobile nav on route change
  useEffect(() => setIsMobileNavOpen(false), [location.pathname]);

  // ESC close for mobile drawer
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsMobileNavOpen(false);
    };
    if (isMobileNavOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileNavOpen]);

  // Body scroll lock when drawer open
  useEffect(() => {
    if (!isMobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileNavOpen]);

  // Focus trap for mobile drawer + restore focus
  useEffect(() => {
    if (!isMobileNavOpen) return;

    lastFocusRef.current = document.activeElement;
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const root = drawerRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const el = lastFocusRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, [isMobileNavOpen]);

  // Restore focus to hamburger after closing
  useEffect(() => {
    if (isMobileNavOpen) return;
    if (openBtnRef.current) {
      setTimeout(() => openBtnRef.current?.focus?.(), 0);
    }
  }, [isMobileNavOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);

      // ✅ smooth fade-out first (hindi bigla)
      setIsLogoutModalVisible(false);

      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        setShowLogoutModal(false);

        // ✅ logout actions
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem(VERIFY_MODAL_SEEN_KEY);

        // ✅ slight delay already happened, so navigate feels smooth
        navigate("/employer/login");
      }, 220);
    } finally {
      // NOTE: after navigate, component will unmount; safe to keep this
      setTimeout(() => setIsLoggingOut(false), 260);
    }
  };

  const SideNavItem = ({ item, onItemClick, isNested = false }) => {
    const isDashboard = item.path === "/employer/dashboard";
    const match = useMatch({ path: item.path, end: isDashboard });
    const isActive = !!match;

    return (
      <li>
        <NavLink
          to={item.path}
          onClick={onItemClick}
          className={[
            "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium select-none",
            isNested ? "pl-9 pr-3" : "px-3",
            "transition-colors duration-150 ease-out",
            focusRing,
            isActive
              ? "bg-slate-100 text-slate-900"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          ].join(" ")}
          aria-current={isActive ? "page" : undefined}
          end={isDashboard}
        >
          <svg
            className={[
              "h-5 w-5 shrink-0 transition-colors",
              isActive
                ? "text-slate-700"
                : "text-gray-500 group-hover:text-gray-700",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={item.icon}
            />
          </svg>

          <span className="truncate">{item.name}</span>
        </NavLink>
      </li>
    );
  };

  const SidebarDropdown = ({ section, onItemClick }) => {
    const isOpen = openDropdowns[section.name];
    const hasActiveChild = section.items.some((item) =>
      location.pathname.startsWith(item.path)
    );

    return (
      <li>
        <button
          type="button"
          onClick={() =>
            setOpenDropdowns((prev) => ({
              ...prev,
              [section.name]: !prev[section.name],
            }))
          }
          className={[
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium select-none",
            "transition-colors duration-150 ease-out",
            focusRing,
            hasActiveChild
              ? "text-slate-900"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          ].join(" ")}
          aria-expanded={isOpen}
        >
          <svg
            className={[
              "h-5 w-5 shrink-0 transition-colors",
              hasActiveChild
                ? "text-slate-700"
                : "text-gray-500 group-hover:text-gray-700",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={section.icon}
            />
          </svg>

          <span className="flex-1 truncate text-left">{section.name}</span>

          <svg
            className={[
              "h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200",
              isOpen ? "rotate-180" : "",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <ul className="mt-1 space-y-1">
            {section.items.map((item) => (
              <SideNavItem
                key={item.name}
                item={item}
                onItemClick={onItemClick}
                isNested
              />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const NavList = ({ onItemClick }) => (
    <nav className="p-3">
      <ul className="space-y-1">
        {navSections.map((section) =>
          section.type === "dropdown" ? (
            <SidebarDropdown
              key={section.name}
              section={section}
              onItemClick={onItemClick}
            />
          ) : (
            <SideNavItem
              key={section.name}
              item={section}
              onItemClick={onItemClick}
            />
          )
        )}
      </ul>
    </nav>
  );

  const logoSrc = "/images/phinma-logo.png";

  return (
    <div className="min-h-screen bg-gray-50" style={layoutVars}>
      {/* Skip link */}
      <a
        href="#main-content"
        className={[
          "sr-only focus:not-sr-only",
          "focus:fixed focus:left-4 focus:top-4 focus:z-[9999]",
          "focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow",
          focusRing,
        ].join(" ")}
      >
        Skip to content
      </a>

      {/* ✅ Logout Confirmation Modal (match screenshot style) */}
      {showLogoutModal && (
        <div
          className={[
            "fixed inset-0 z-[70] flex items-center justify-center px-4",
            "bg-black/50",
            "transition-opacity duration-200",
            isLogoutModalVisible ? "opacity-100" : "opacity-0",
          ].join(" ")}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeLogoutModal();
          }}
        >
          <div
            ref={logoutDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            className={[
              "w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden",
              "transform transition-all duration-200",
              isLogoutModalVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
            ].join(" ")}
          >
            <div className="p-6 sm:p-7">
              {/* ✅ warning icon */}
              <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center">
                <img
                  src="/images/error.png"
                  alt="Error"
                  className="w-14 h-14 object-contain"
                  draggable="false"
                />
              </div>

              <h2
                id="logout-title"
                className="text-lg sm:text-xl font-extrabold text-gray-900 text-center"
              >
                Sign out?
              </h2>

              <p
                id="logout-desc"
                className="mt-2 text-sm sm:text-base text-gray-600 text-center"
              >
                You’ll be signed out of your account. You can sign in again anytime.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                {/* ✅ Log out (red) */}
                <button
                  ref={logoutPrimaryBtnRef}
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={[
                    "px-6 py-3 rounded-xl font-semibold",
                    "bg-red-600 text-white hover:bg-red-700 transition-colors",
                    focusRing,
                    isLoggingOut ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {isLoggingOut ? "Logging out…" : "Log out"}
                </button>

                {/* ✅ Cancel (outline) */}
                <button
                  ref={logoutCancelBtnRef}
                  type="button"
                  onClick={closeLogoutModal}
                  disabled={isLoggingOut}
                  className={[
                    "px-6 py-3 rounded-xl font-semibold",
                    "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 transition-colors",
                    focusRing,
                    isLoggingOut ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          role="presentation"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        id="employer-mobile-drawer"
        ref={drawerRef}
        className={[
          "fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-xl transition-transform",
          "md:hidden",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employer-nav-title"
      >
        {/* header */}
        <div className="h-[72px] px-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt="Agapay logo"
              className="h-10 w-10 object-contain"
              loading="eager"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />

            <div className="min-w-0">
              <p
                id="employer-nav-title"
                className="text-sm font-bold tracking-wide text-gray-900 truncate"
              >
                AGAPAY
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            className={[
              "rounded-md p-2 text-gray-700 hover:bg-gray-100",
              focusRing,
            ].join(" ")}
            aria-label="Close navigation"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="h-[calc(100%-72px)] overflow-y-auto">
          <NavList onItemClick={() => setIsMobileNavOpen(false)} />

          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={openLogoutModal}
              disabled={isLoggingOut}
              className={[
                "flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                "border border-gray-200",
                focusRing,
                isLoggingOut
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "text-gray-700 hover:bg-gray-900 hover:text-white",
              ].join(" ")}
            >
              <span>{isLoggingOut ? "Logging out…" : "Sign out"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={[
          "hidden md:flex md:flex-col md:fixed md:z-40",
          "bg-white shadow-sm",
          "rounded-2xl",
          "border border-gray-200/80",
          "overflow-hidden",
        ].join(" ")}
        style={{
          width: "var(--sidebar-w)",
          left: "var(--sidebar-gutter)",
          top: "var(--sidebar-gutter)",
          bottom: "var(--sidebar-gutter)",
        }}
      >
        {/* header */}
        <div className="h-[72px] px-6 flex items-center border-b border-gray-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt="Agapay logo"
              className="h-10 w-10 object-contain"
              loading="eager"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />

            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-wide text-gray-900 truncate">
                AGAPAY
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>

      
      </aside>

      {/* Main content */}
      <div
        className={[
          "min-h-screen flex flex-col",
          "pl-0",
          "md:pl-[calc(var(--sidebar-w)+(var(--sidebar-gutter)*2))]",
        ].join(" ")}
      >
        {/* MOBILE TOP BAR */}
        <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="h-14 px-4 flex items-center gap-3">
            <button
              ref={openBtnRef}
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className={[
                "rounded-lg p-2 text-gray-800 hover:bg-gray-100",
                focusRing,
              ].join(" ")}
              aria-label="Open navigation"
              aria-expanded={isMobileNavOpen}
              aria-controls="employer-mobile-drawer"
            >
              {/* hamburger icon */}
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <img
                src={logoSrc}
                alt=""
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  AGAPAY
                </p>
                <p className="text-xs text-gray-500 truncate">{currentLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* ✅ Verification Required Modal */}
      {showVerifyModal && (
        <div
          className={[
            "fixed inset-0 z-[60] flex items-center justify-center px-4",
            "bg-black/50",
            "transition-opacity duration-300",
            isVerifyModalVisible ? "opacity-100" : "opacity-0",
          ].join(" ")}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeVerifyModal();
          }}
        >
          <div
            ref={verifyDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-title"
            aria-describedby="verify-desc"
            className={[
              "w-full max-w-md rounded-2xl bg-white shadow-xl",
              "transform transition-all duration-300",
              isVerifyModalVisible
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-2",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-6 pb-4">
              <div className="min-w-0">
                <h2 id="verify-title" className="text-lg font-bold text-gray-900">
                  Employer Verification Needed
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      statusMeta.chip,
                    ].join(" ")}
                    aria-label={`Verification status: ${statusMeta.label}`}
                  >
                    {statusMeta.label.toUpperCase()}
                  </span>

                  <span className="text-xs text-gray-500">
                    To post jobs and use all employer features
                  </span>
                </div>
              </div>

              {/* Close (X) */}
              <button
                ref={verifyCloseBtnRef}
                type="button"
                onClick={closeVerifyModal}
                className={[
                  "shrink-0 rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  focusRing,
                ].join(" ")}
                aria-label="Close verification modal"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6">
              <p id="verify-desc" className="text-sm text-gray-700">
                Please upload these documents in{" "}
                <span className="font-semibold">Company Profile</span>:
              </p>

              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>SEC Registration</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>BIR Registration</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>DTI Registration</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span>City/ Municipality Permit</span>
                </li>
              </ul>

              <p className="mt-3 text-xs text-gray-500">{statusMeta.helper}</p>

              {verificationStatus && (
                <p className="mt-2 text-[11px] text-gray-400">
                  Status code:{" "}
                  <span className="font-semibold uppercase">
                    {String(verificationStatus).replace("_", " ")}
                  </span>
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeVerifyModal}
                className={[
                  "inline-flex justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold",
                  "text-gray-700 hover:bg-gray-50",
                  focusRing,
                ].join(" ")}
              >
                Later
              </button>

              <button
                ref={verifyPrimaryBtnRef}
                type="button"
                onClick={() => {
                  sessionStorage.setItem(VERIFY_MODAL_SEEN_KEY, "1");
                  setShowVerifyModal(false);
                  navigate("/employer/company-profile#verification");
                }}
                className={[
                  "inline-flex justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white",
                  "hover:bg-green-800",
                  focusRing,
                ].join(" ")}
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerLayout;