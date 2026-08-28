import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainNavbar from "../../components/shared/MainNavbar";
import api from "../../services/api";

const API_ORIGIN = String(
  api?.defaults?.baseURL || "https://phinmaau-job-portal-atlas.onrender.com/api"
).replace(/\/api\/?$/, "");

const resolveCompanyLogoUrl = (logo) => {
  const value = String(logo || "").trim();

  if (!value) return "/images/companyicon.png";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/uploads")) return `${API_ORIGIN}${value}`;

  return `${API_ORIGIN}/${value.replace(/^\/+/, "")}`;
};

const MainLandingPage = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnersError, setPartnersError] = useState("");
  const partnersScrollRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPartners = async () => {
      try {
        setPartnersLoading(true);
        setPartnersError("");

        const response = await api.get("/companies/verified");
        const companies = Array.isArray(response?.data?.companies)
          ? response.data.companies
          : [];

        const normalizedPartners = companies
          .filter(
            (company) =>
              company?._id &&
              String(company?.companyName || "").trim() &&
              String(company?.companyLogo || "").trim()
          )
          .map((company) => ({
            id: company._id,
            name: String(company.companyName || "").trim(),
            openings: Math.max(0, Number(company.openingsCount) || 0),
            logo: resolveCompanyLogoUrl(company.companyLogo),
          }))
          .sort(
            (a, b) =>
              b.openings - a.openings || a.name.localeCompare(b.name)
          );

        if (isMounted) {
          setPartners(normalizedPartners);
        }
      } catch (error) {
        console.error("Failed to load partner companies:", error);

        if (isMounted) {
          setPartners([]);
          setPartnersError(
            "We couldn't load partner company logos right now."
          );
        }
      } finally {
        if (isMounted) {
          setPartnersLoading(false);
        }
      }
    };

    fetchPartners();

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollPartners = (direction) => {
    const container = partnersScrollRef.current;
    if (!container) return;

    const amount = Math.max(320, container.clientWidth * 0.75);
    container.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

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
    <div className="min-h-screen bg-white">
      <MainNavbar />

      <main className="relative min-h-screen bg-white pt-16">
        <div className="relative mx-auto flex w-full max-w-[1450px] flex-col px-5 pb-8 pt-14 sm:px-8 lg:px-12 lg:pb-8 lg:pt-12">
          <section className="shrink-0 text-center">
            <h1 className="mx-auto max-w-[1240px] text-[34px] font-semibold leading-[1.12] tracking-tight text-[#202020] sm:text-5xl lg:text-[50px] xl:text-[54px]">
              <span className="block">Your Future Employer is</span>
              <span className="block lg:whitespace-nowrap">
                Looking for{" "}
                <span className="font-semibold tracking-[-0.02em] text-[#3558A8]">
                  Someone Exactly Like You!
                </span>
              </span>
            </h1>

            <p className="mt-4 text-base font-semibold text-[#202020] sm:text-lg lg:mt-3">
              The job market is competitive but you are prepared.
            </p>

            <button
              type="button"
              onClick={() => navigate("/jobs")}
              className="mt-5 inline-flex h-14 min-w-[290px] items-center justify-center gap-5 rounded-2xl bg-[#212C61] px-8 text-lg font-semibold text-white shadow-sm transition hover:bg-[#17224f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e4ba0] focus-visible:ring-offset-2 lg:mt-4 lg:h-12 lg:min-w-[270px]"
            >
              <span>Find your job</span>
              <svg
                className="h-5 w-5"
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
          </section>

          <section className="mx-auto mt-7 grid w-full max-w-[1240px] grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-5 lg:grid-cols-3 lg:gap-6">
            {campuses.map((campus) => (
              <article
                key={campus.id}
                className="group relative h-[230px] overflow-hidden rounded-2xl border border-black/10 bg-slate-100 shadow-md sm:last:col-span-2 lg:h-[210px] lg:last:col-span-1"
              >
                <img
                  src={campus.img}
                  alt={campus.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                  decoding="async"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                <div className="relative flex h-full flex-col justify-end p-5 text-left text-white">
                  <h2 className="text-2xl font-bold leading-none drop-shadow">
                    {campus.name}
                  </h2>

                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white/95 drop-shadow">
                    <svg
                      className="h-4 w-4 shrink-0 text-yellow-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                    </svg>
                    <span>{campus.location}</span>
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-8 shrink-0 text-center lg:mt-5">
            <h2 className="text-2xl font-semibold text-[#202020] lg:text-[28px]">
              Find your next job with one of Our Partners
            </h2>

            <div className="relative mx-auto mt-5 w-full max-w-[1380px] lg:mt-3">
              {!partnersLoading && partners.length > 11 ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollPartners("previous")}
                    className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#212C61] text-white shadow-md transition hover:bg-[#17224f]"
                    aria-label="Previous partner logos"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        d="M15 18l-6-6 6-6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollPartners("next")}
                    className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#212C61] text-white shadow-md transition hover:bg-[#17224f]"
                    aria-label="Next partner logos"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        d="M9 6l6 6-6 6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              ) : null}

              <div
                ref={partnersScrollRef}
                className={`flex w-full items-center gap-7 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                  partners.length <= 11 ? "justify-center" : "justify-start px-14"
                }`}
              >
                {partnersLoading
                  ? Array.from({ length: 9 }).map((_, index) => (
                      <div
                        key={`partner-loading-${index}`}
                        className="flex h-[78px] min-w-[96px] items-center justify-center rounded-lg border border-[#E5E7EB] bg-white shadow-sm"
                      >
                        <div className="h-12 w-20 animate-pulse rounded bg-slate-200" />
                      </div>
                    ))
                  : partners.map((partner) => (
                      <div
                        key={partner.id}
                        className="flex h-[78px] min-w-[96px] items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        title={partner.name}
                      >
                        <img
                          src={partner.logo}
                          alt={`${partner.name} logo`}
                          className="max-h-[56px] max-w-[80px] rounded-2xl object-contain"
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/images/companyicon.png";
                          }}
                        />
                      </div>
                    ))}
              </div>
            </div>

            {!partnersLoading && partnersError ? (
              <p className="mt-3 text-sm text-black">{partnersError}</p>
            ) : null}

            {!partnersLoading && !partnersError && partners.length === 0 ? (
              <p className="mt-3 text-sm text-black">
                No partner company logos are available right now.
              </p>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
};

export default MainLandingPage;
