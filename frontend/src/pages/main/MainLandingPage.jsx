import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainNavbar from "../../components/shared/MainNavbar";

const PartnersSection = ({ partners }) => {
  const [visibleCount, setVisibleCount] = useState(4);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setVisibleCount(1);
      else if (w < 1024) setVisibleCount(2);
      else setVisibleCount(4);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [visibleCount]);

  const displayPartners = useMemo(() => {
    if (!partners?.length) return [];

    const items = [];
    for (let i = 0; i < visibleCount; i++) {
      items.push(partners[(currentIndex + i) % partners.length]);
    }

    return items;
  }, [partners, visibleCount, currentIndex]);

  const handlePrev = () => {
    if (!partners?.length) return;
    setCurrentIndex((prev) => (prev - 1 + partners.length) % partners.length);
  };

  const handleNext = () => {
    if (!partners?.length) return;
    setCurrentIndex((prev) => (prev + 1) % partners.length);
  };

  return (
    <div className="relative w-full max-w-[1550px] mx-auto">
      <h2 className="text-center text-3xl md:text-4xl font-semibold text-slate-900">
        Find your next job with one of Our Partners
      </h2>

      <div className="relative mt-10 px-6 md:px-12">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous partners"
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full leading-none bg-white border border-slate-200 shadow-md flex items-center justify-center text-2xl text-[#2e66a6] hover:bg-slate-50 transition"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next partners"
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full leading-none bg-white border border-slate-200 shadow-md flex items-center justify-center text-2xl text-[#2e66a6] hover:bg-slate-50 transition"
        >
          ›
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 px-10 md:px-14">
          {displayPartners.map((p, idx) => (
            <article
              key={`${p.id}-${idx}`}
              className="relative rounded-2xl overflow-hidden shadow-lg border border-black/10 h-[260px] md:h-[280px] bg-white"
              aria-label={`${p.name} partner card`}
            >
              <img
                src={p.img}
                alt={p.name}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />

              <div className="relative h-full p-5 text-white flex flex-col">
                <h3 className="text-xl md:text-2xl font-extrabold leading-tight drop-shadow">
                  {p.name}
                </h3>

                <p className="mt-1 text-sm text-white/90 font-semibold drop-shadow">
                  {p.tagline}
                </p>

                <p className="mt-2 text-sm md:text-base text-white/85 leading-snug line-clamp-3 max-w-[95%]">
                  {p.desc}
                </p>

                <div className="mt-auto pt-4 text-sm md:text-base font-semibold text-white/95 drop-shadow">
                  {p.openings} Openings
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

const MainFooter = () => {
  return (
    <footer className="bg-[#f5f5f5] border-t border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Left Column */}
          <div>
            <img
              src="/images/agapay.png"
              alt="AGAPAY"
              className="h-10 w-auto"
            />

            <h3 className="mt-6 text-[20px] md:text-[22px] font-bold text-slate-700 leading-tight max-w-[320px]">
              Your Future Employer is Looking for Someone Exactly Like You!
            </h3>

            <p className="mt-4 text-slate-600 text-base leading-relaxed max-w-[340px]">
              The job market is competitive but you are prepared.
            </p>

            <div className="mt-6 space-y-3 text-slate-600 text-sm md:text-[15px]">
              <p>✉ agapay@au.phinma.edu.ph</p>
              <p>☎ +63 (2) 8123-4567</p>
              <p className="flex items-start gap-2">
                <svg
                  className="w-6 h-6 text-black-500 mt-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                </svg>

                <span>
                  PHINMA - Araullo University, Cabanatuan City, Nueva Ecija
                </span>
              </p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              {/* Facebook */}
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2.6v-2.9h2.6V9.8c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6v2h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z" />
                </svg>
              </div>

              {/* LinkedIn */}
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <svg
                  className="w-4 h-4 text-blue-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v12h-4V8zm7.5 0h3.6v1.6h.1c.5-.9 1.7-1.8 3.5-1.8 3.7 0 4.4 2.4 4.4 5.6V20h-4v-5.3c0-1.3 0-3-1.9-3s-2.2 1.5-2.2 2.9V20h-4V8z" />
                </svg>
              </div>

              {/* Twitter/X style */}
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <svg
                  className="w-4 h-4 text-sky-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M24 4.6a9.8 9.8 0 0 1-2.8.8 4.9 4.9 0 0 0 2.2-2.7 9.8 9.8 0 0 1-3.1 1.2 4.9 4.9 0 0 0-8.4 4.5A13.9 13.9 0 0 1 1.7 3.1 4.9 4.9 0 0 0 3.2 9a4.8 4.8 0 0 1-2.2-.6v.1a4.9 4.9 0 0 0 3.9 4.8 4.9 4.9 0 0 1-2.2.1 4.9 4.9 0 0 0 4.6 3.4A9.9 9.9 0 0 1 0 19.5 13.9 13.9 0 0 0 7.5 22c9 0 13.9-7.5 13.9-14v-.6A9.7 9.7 0 0 0 24 4.6z" />
                </svg>
              </div>

              {/* YouTube */}
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Job Seeker */}
          <div>
            <h4 className="text-sm font-extrabold tracking-[0.16em] text-slate-900 uppercase">
              Job Seeker
            </h4>

            <ul className="mt-6 space-y-4 text-slate-600 text-[15px]">
              <li>Job Search</li>
              <li>Job Offers</li>
              <li>Job Application</li>
              <li>Saved Jobs</li>
              <li>Companies</li>
              <li>Job Seeker Profile</li>
            </ul>
          </div>

          {/* Employers */}
          <div>
            <h4 className="text-sm font-extrabold tracking-[0.16em] text-slate-900 uppercase">
              Employers
            </h4>

            <ul className="mt-6 space-y-4 text-slate-600 text-[15px]">
              <li>Post Job</li>
              <li>Find Talent</li>
              <li>Company Profile</li>
              <li>Manage Talent</li>
            </ul>
          </div>

          {/* About Agapay */}
          <div>
            <h4 className="text-sm font-extrabold tracking-[0.16em] text-slate-900 uppercase">
              About Agapay
            </h4>

            <ul className="mt-6 space-y-4 text-slate-600 text-[15px]">
              <li>About Us</li>
              <li>Contact Us</li>
              <li>Careers</li>
              <li>Partners with Us</li>
              <li>Help Center</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-300 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © 2026 PHINMA ARAULLO UNIVERSITY. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-slate-500 text-sm">
            <span>Privacy Policy</span>
            <span>|</span>
            <span>Terms of Use</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const MainLandingPage = () => {
  const navigate = useNavigate();

  const BLUE = {
    primary: "#2e66a6",
    hover: "#245387",
    active: "#1f476f",
  };

  const partners = useMemo(
    () => [
      {
        id: 1,
        name: "MediCard",
        tagline: "Your Ultimate Health Plan",
        desc: "MediCard is a leading HMO offering comprehensive healthcare services through its clinics, partners, and doctors nationwide.",
        openings: 30,
        img: "/images/medicard.png",
      },
      {
        id: 2,
        name: "St. Luke's Medical Center",
        tagline: "We Love Life",
        desc: "St. Luke's Medical Center sets global standards in healthcare with advanced facilities, expert doctors, and world-class service.",
        openings: 12,
        img: "/images/stluke.png",
      },
      {
        id: 3,
        name: "Medical City",
        tagline: "Trusted Healthcare",
        desc: "Medical City continuously strives to deliver compassionate healthcare through its nationwide partner network and clinics.",
        openings: 12,
        img: "/images/medical.png",
      },
    ],
    []
  );

  const campuses = useMemo(
    () => [
      {
        id: 1,
        name: "Au Main",
        location: "Cabanatuan City, Nueva Ecija",
        img: "/images/main.png",
      },
      {
        id: 2,
        name: "Au South",
        location: "Cabanatuan City, Nueva Ecija",
        img: "/images/south.png",
      },
      {
        id: 3,
        name: "Au San Jose",
        location: "San Jose City, Nueva Ecija",
        img: "/images/sanjose.png",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <MainNavbar />

      <main>
        {/* HERO */}
        <section className="px-4 pt-16 md:pt-20 pb-10 min-h-[calc(100dvh-4rem)] md:min-h-0 flex items-center md:block">
          <div className="max-w-6xl mx-auto w-full">
            <div className="mt-0 md:mt-8 text-center">
              <div className="flex justify-center">
                <img
                  src="/images/agapaymo.png"
                  alt="AGAPAY"
                  className="h-28 md:h-44 w-auto"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>

              <h1 className="font-sans font-semibold text-slate-900 text-2xl md:text-4xl lg:text-5xl max-w-4xl mx-auto leading-tight">
                Your Dream Job and Team is{" "}
                <span className="block md:inline" style={{ color: BLUE.primary }}>
                  Just <br className="hidden md:block" />A Click Away
                </span>
              </h1>

              <p className="mt-4 text-slate-600 max-w-2xl mx-auto leading-relaxed text-lg">
                Create an account or sign in to explore jobs and top talent all in one place.
                <br />
                <span className="font-semibold" style={{ color: BLUE.primary }}>
                  The simplest way to career opportunities starts here.
                </span>
              </p>

              <div className="mt-7">
                <button
                  type="button"
                  onClick={() => navigate("/jobs")}
                  className={[
                    "w-[220px] inline-flex items-center justify-center gap-3 py-3 rounded-xl font-semibold",
                    "text-white transition-colors shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  ].join(" ")}
                  style={{ backgroundColor: BLUE.primary }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BLUE.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BLUE.primary)}
                  onMouseDown={(e) => (e.currentTarget.style.backgroundColor = BLUE.active)}
                  onMouseUp={(e) => (e.currentTarget.style.backgroundColor = BLUE.hover)}
                >
                  <span>Find your job</span>
                  <svg
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

            <div className="mt-10 flex justify-center">
  <div
    className="inline-flex items-center gap-1 text-slate-600 select-none"
    aria-hidden="true"
  >
    <span className="text-[13px] md:text-sm font-normal">
      Explore more
    </span>

    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
</div>
            </div>
          </div>
        </section>

        {/* OUR CAMPUSES */}
        <section id="campuses-section" className="px-4 pb-16 md:pb-20 mt-24 md:mt-28">
          <div className="max-w-[1400px] mx-auto">
            <div className="mb-8 md:mb-10">
              <h2 className="text-3xl md:text-4xl font-semibold text-slate-700"></h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {campuses.map((campus) => (
                <article
                  key={campus.id}
                  className="group relative h-[260px] md:h-[300px] rounded-2xl overflow-hidden shadow-lg border border-black/10 bg-white"
                  aria-label={`${campus.name} campus card`}
                >
                  <img
                    src={campus.img}
                    alt={campus.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

                  <div className="relative h-full flex flex-col justify-end p-5 md:p-6 text-white">
                    <h3 className="text-xl md:text-2xl font-semibold leading-tight drop-shadow">
                      {campus.name}
                    </h3>

                    <p className="mt-2 text-sm md:text-base text-white/90 drop-shadow flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 shrink-0"
                        aria-hidden="true"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                      </svg>
                      <span>{campus.location}</span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* PARTNERS */}
        <section
          className={[
            "px-4",
            "py-16 sm:py-20 md:py-24",
            "bg-gradient-to-b from-white via-blue-50 to-slate-50",
          ].join(" ")}
        >
          <PartnersSection partners={partners} />
        </section>
      </main>

      <MainFooter />
    </div>
  );
};

export default MainLandingPage;