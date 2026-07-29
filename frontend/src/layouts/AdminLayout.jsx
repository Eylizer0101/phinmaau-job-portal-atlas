import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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


const navItems = useMemo(
  () => [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "User Management", path: "/admin/users" },
    { name: "Jobseeker Verification", path: "/admin/jobseeker-verification" }, 
    { name: "Employer Verification", path: "/admin/employer-verification" },// ✅ ADD THIS LINE
    { name: "Job Offers", path: "/admin/job-offers" },
    { name: "Applications", path: "/admin/applications" },
    { name: "System Log", path: "/admin/system-logs" },
    { name: "Archive", path: "/admin/archive" },
   

  ],
  []
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
          <span className="truncate">{item.name}</span>
        </NavLink>
      </li>
    );
  };

  const NavList = ({ onItemClick }) => (
    <nav className="p-3">
      <ul className="space-y-1">
        {navItems.map((item) => (
          <SideNavItem key={item.name} item={item} onItemClick={onItemClick} />
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
