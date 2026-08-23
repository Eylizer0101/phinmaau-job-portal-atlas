import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({
    Main: true,
    Records: true,
    Approvals: false,
    Settings: false,
  });

  // ✅ Logout modal state (QA/UI confirm)
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false); // for smooth animation
  const logoutTimerRef = useRef(null);

  // ✅ ROLE GUARD (admin only)
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
      navigate("/login", { replace: true });
      return;
    }

    // ✅ only admin allowed
    if (user.role !== "admin") {
      // redirect based on role
      if (user.role === "employer") navigate("/employer/dashboard", { replace: true });
      else if (user.role === "jobseeker") navigate("/jobseeker/dashboard", { replace: true });
      else navigate("/", { replace: true });
    }
  }, [navigate]);

  // A11y refs
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


  const navSections = useMemo(
    () => [
      {
        name: "Main",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
        items: [
          {
            name: "Dashboard",
            path: "/admin/dashboard",
            icon: "M4 6a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2z",
          },
          {
            name: "Analytics",
            path: "/admin/analytics",
            icon: "M3 3v18h18M7 16l4-5 4 3 5-7",
          },
        ],
      },
      {
        name: "Records",
        icon: "M9 12h6m-6 4h6M9 8h6m2 13H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z",
        items: [
          {
            name: "Users",
            path: "/admin/users",
            icon: "M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H3v-2a4 4 0 014-4h2a4 4 0 014 4v2zm-5-8a4 4 0 100-8 4 4 0 000 8zm9-1a3 3 0 10-3-5.83",
          },
          {
            name: "Job Offers",
            path: "/admin/job-offers",
            icon: "M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z",
          },
          {
            name: "Applications",
            path: "/admin/applications",
            icon: "M9 12h6m-6 4h6M9 8h6m2 13H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z",
          },
        ],
      },
      {
        name: "Approvals",
        icon: "M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z",
        items: [
          {
            name: "Job Seeker",
            path: "/admin/jobseeker-verification",
            icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 0l2 2 4-4",
          },
          {
            name: "Employer",
            path: "/admin/employer-verification",
            icon: "M3 21h18M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16m0-12h4a2 2 0 012 2v10M9 7h2m-2 4h2m-2 4h2",
          },
          {
            name: "Request Edit",
            path: "/admin/employer-job-edit-requests",
            icon: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.5-10.5a2.12 2.12 0 013 3L12 13l-4 1 1-4 7.5-7.5z",
          },
        ],
      },
      {
        name: "Settings",
        icon: "M12 15.5A3.5 3.5 0 1012 8a3.5 3.5 0 000 7.5zm7.4-3.5a7.8 7.8 0 00-.1-1l2-1.6-2-3.4-2.4 1a7.8 7.8 0 00-1.7-1L15 3.5h-4L10.6 6a7.8 7.8 0 00-1.7 1L6.5 6 4.5 9.4 6.5 11a7.8 7.8 0 000 2L4.5 14.6 6.5 18l2.4-1a7.8 7.8 0 001.7 1l.4 2.5h4l.4-2.5a7.8 7.8 0 001.7-1l2.4 1 2-3.4-2-1.6a7.8 7.8 0 00.1-1z",
        items: [
          {
            name: "Activity Logs",
            path: "/admin/system-logs",
            icon: "M12 8v5l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
          },
          {
            name: "Archive",
            path: "/admin/archive",
            icon: "M5 8h14M5 8l1 13h12l1-13M4 3h16v5H4V3zm6 9h4",
          },
        ],
      },
    ],
    []
  );

  const navItems = useMemo(
    () => navSections.flatMap((section) => section.items),
    [navSections]
  );

  const currentLabel = useMemo(() => {
    const match = navItems
      .filter((i) => location.pathname.startsWith(i.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match?.name || "Dashboard";
  }, [location.pathname, navItems]);

  useEffect(() => setIsMobileNavOpen(false), [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsMobileNavOpen(false);
    };
    if (isMobileNavOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileNavOpen]);

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

  useEffect(() => {
    if (isMobileNavOpen) return;
    if (openBtnRef.current) {
      setTimeout(() => openBtnRef.current?.focus?.(), 0);
    }
  }, [isMobileNavOpen]);

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

  // ✅ cleanup timer
  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, []);

  // ✅ Logout modal a11y + focus management
  const logoutDialogRef = useRef(null);
  const logoutCancelBtnRef = useRef(null);
  const logoutPrimaryBtnRef = useRef(null);
  const lastFocusBeforeLogoutRef = useRef(null);

  const openLogoutModal = () => {
    if (isLoggingOut) return;
    setShowLogoutModal(true);
  };

  const closeLogoutModal = () => {
    if (isLoggingOut) return;

    // smooth close first then unmount
    setIsLogoutModalVisible(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      setShowLogoutModal(false);
    }, 220);
  };

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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // ✅ smooth fade-out first then navigate
      setIsLogoutModalVisible(false);

      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        setShowLogoutModal(false);

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }, 220);
    } finally {
      setTimeout(() => setIsLoggingOut(false), 260);
    }
  };

  const SideNavItem = ({ item, onItemClick }) => {
    const isDashboard = item.path === "/admin/dashboard";
    const match = useMatch({ path: item.path, end: isDashboard });
    const isActive = !!match;

    return (
      <li>
        <NavLink
          to={item.path}
          onClick={onItemClick}
          className={[
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium select-none",
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
            setOpenDropdowns((previous) => ({
              ...previous,
              [section.name]: !previous[section.name],
            }))
          }
          className={[
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold select-none",
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <ul className="mt-1 space-y-1 pl-2">
            {section.items.map((item) => (
              <SideNavItem key={item.name} item={item} onItemClick={onItemClick} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const NavList = ({ onItemClick }) => (
    <nav className="p-3">
      <ul className="space-y-2">
        {navSections.map((section) => (
          <SidebarDropdown key={section.name} section={section} onItemClick={onItemClick} />
        ))}
      </ul>
    </nav>
  );

  const logoSrc = "/images/phinma-logo.png";

  return (
    <div className="min-h-screen bg-gray-50" style={layoutVars}>
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
          Log out?
        </h2>

        <p
          id="logout-desc"
          className="mt-2 text-sm sm:text-base text-gray-600 text-center"
        >
          Are you sure you want to log out of your admin account?
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

      {/* overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          role="presentation"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* mobile drawer */}
      <aside
        ref={drawerRef}
        className={[
          "fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-xl transition-transform",
          "md:hidden",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-nav-title"
      >
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
            <p id="admin-nav-title" className="text-sm font-bold tracking-wide text-gray-900 truncate">
           AGAPAY
            </p>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            className={["rounded-md p-2 text-gray-700 hover:bg-gray-100", focusRing].join(" ")}
            aria-label="Close navigation"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
                  : "text-gray-700 hover:bg-red-600 hover:text-white",
              ].join(" ")}
            >
              <span>{isLoggingOut ? "Logging out…" : "Logout"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* desktop sidebar */}
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
            <h2 className="text-base font-bold tracking-wide text-gray-900 truncate">
              AGAPAY
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>

      </aside>

      {/* content */}
      <div
        className={[
          "min-h-screen flex flex-col",
          "pl-0",
          "md:pl-[calc(var(--sidebar-w)+(var(--sidebar-gutter)*2))]",
        ].join(" ")}
      >
        {/* mobile topbar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="h-14 px-4 flex items-center gap-3">
            <button
              ref={openBtnRef}
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className={["rounded-lg p-2 text-gray-800 hover:bg-gray-100", focusRing].join(" ")}
              aria-label="Open navigation"
              aria-expanded={isMobileNavOpen}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">AGAPAY</p>
              <p className="text-xs text-gray-500 truncate">{currentLabel}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
