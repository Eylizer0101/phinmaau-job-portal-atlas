// src/components/shared/MainNavbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const BRAND = {
  primary: "#1e4ba0",
  hover: "#1b4290",
  active: "#163879",
  focus: "#1e4ba0",
};

const MainNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  const lastScrollYRef = useRef(0);

  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const drawerRef = useRef(null);

  const location = useLocation();

  const openMobileMenu = () => setIsMobileMenuOpen(true);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navLinks = [
    { path: "/", label: "HOME" },
    { path: "/jobs", label: "JOB OFFERS" },
    { path: "/companies", label: "COMPANIES" },
  ];

  // Hide/show navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const last = lastScrollYRef.current;

      if (currentScrollY < last) {
        setIsNavbarVisible(true);
      } else if (currentScrollY > last && currentScrollY > 100) {
        if (!isMobileMenuOpen) setIsNavbarVisible(false);
      }

      if (currentScrollY < 10) setIsNavbarVisible(true);

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileMenuOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [isMobileMenuOpen]);

  // Escape + focus trap
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    closeButtonRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMobileMenu();
        return;
      }

      if (e.key !== "Tab") return;

      const root = drawerRef.current;
      if (!root) return;

      const focusable = root.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      menuButtonRef.current?.focus?.();
    }
  }, [isMobileMenuOpen]);

  const isActive = (path) => location.pathname === path;

  // ✅ Desktop nav link styling (active + focus-visible)
  const desktopNavBase =
    "relative text-sm font-medium text-gray-700 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded";
  const desktopNavActive = "font-semibold";
  const desktopNavUnderline =
    "absolute left-0 -bottom-2 h-[2px] w-full rounded-full";

  // ✅ Mobile item (use BRAND, not tailwind blue-700)
  const mobileItemBase =
    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset";
  const mobileItemActive = "bg-gray-100";
  const mobileItemInactive = "text-gray-800 hover:bg-gray-100";

  // ✅ Buttons
  // Sign In (secondary)
  const authBtnSecondary =
    "px-6 py-2.5 text-base font-medium rounded-2xl border-2 border-gray-300 text-gray-800 bg-white transition-all duration-200 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  // Sign Up (primary - BLUE)
  const authBtnPrimary =
    "px-6 py-2.5 text-base font-semibold rounded-2xl border-2 border-transparent text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  return (
    <>
      {/* Navbar */}
      <nav
        className={`bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
          isNavbarVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{
          "--tw-ring-color": BRAND.focus,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* LEFT */}
            <div className="flex items-center gap-2 md:w-1/4">
              {/* Mobile Button */}
              <button
                ref={menuButtonRef}
                type="button"
                className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                style={{ "--tw-ring-color": BRAND.focus }}
                onClick={openMobileMenu}
                aria-label="Open main menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="main-mobile-drawer"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Brand cluster */}
              <div className="flex items-center gap-2">
                <img
                  src="/images/phinma-logo.png"
                  alt="PHINMA"
                  className="h-10 w-auto"
                  loading="eager"
                />
                <Link to="/" className="flex items-center">
                  <img
                    src="/images/agapay.png"
                    alt="AGAPAY"
                    className="h-10 w-auto"
                    loading="eager"
                  />
                </Link>
              </div>
            </div>

            {/* CENTER (Desktop Links) */}
            <div className="hidden md:flex md:flex-1 md:justify-center md:items-center md:space-x-10">
              {navLinks.map(({ path, label }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    aria-current={active ? "page" : undefined}
                    className={`${desktopNavBase} ${active ? desktopNavActive : ""}`}
                    style={{
                      color: active ? BRAND.primary : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.color = BRAND.hover;
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.color = "";
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* RIGHT (Auth Buttons) */}
            <div className="hidden md:flex md:w-1/4 md:items-center md:justify-end md:space-x-4">
              {/* Sign Up (Primary - Blue) */}
              <Link
                to="/join-as"
                className={authBtnPrimary}
                style={{
                  backgroundColor: BRAND.primary,
                  borderColor: BRAND.primary,
                  "--tw-ring-color": BRAND.focus,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
              >
                Sign Up
              </Link>

              {/* Sign In (Secondary) */}
              <Link
                to="/login"
                className={authBtnSecondary}
                style={{ "--tw-ring-color": BRAND.focus }}
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <div
        className={`md:hidden fixed inset-0 z-50 ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-40" : "opacity-0"
          }`}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />

        <div
          ref={drawerRef}
          id="main-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          className={`absolute inset-y-0 left-0 bg-white shadow-xl transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } w-[260px] sm:w-[320px]`}
          style={{ "--tw-ring-color": BRAND.focus }}
        >
          <div className="px-4 pt-5 pb-4 border-b flex justify-between items-center">
            <img src="/images/agapay.png" alt="AGAPAY" className="h-8 w-auto" />
            <button
              ref={closeButtonRef}
              onClick={closeMobileMenu}
              className="h-10 w-10 rounded-md flex items-center justify-center hover:bg-gray-100 focus:outline-none focus-visible:ring-2"
              style={{ "--tw-ring-color": BRAND.focus }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="p-3 space-y-2">
            {navLinks.map(({ path, label }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={closeMobileMenu}
                  aria-current={active ? "page" : undefined}
                  className={`${mobileItemBase} ${
                    active ? mobileItemActive : mobileItemInactive
                  }`}
                  style={{
                    color: active ? BRAND.primary : undefined,
                    "--tw-ring-color": BRAND.focus,
                  }}
                >
                  {label}
                </Link>
              );
            })}

            <div className="my-3 h-px bg-gray-200" />

            {/* Sign In (Secondary) */}
            <Link
              to="/login"
              onClick={closeMobileMenu}
              className="w-full inline-flex items-center justify-center rounded-md px-4 py-2.5 border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ "--tw-ring-color": BRAND.focus }}
            >
              Sign In
            </Link>

            {/* Sign Up (Primary - Blue) */}
            <Link
              to="/join-as"
              onClick={closeMobileMenu}
              className="w-full inline-flex items-center justify-center rounded-md px-4 py-2.5 border border-transparent text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                backgroundColor: BRAND.primary,
                borderColor: BRAND.primary,
                "--tw-ring-color": BRAND.focus,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainNavbar;