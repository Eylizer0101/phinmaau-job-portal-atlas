import React, { useEffect } from "react";

const CAMPUSES = [
  {
    name: "AU Main",
    location: "Cabanatuan City",
    image: "/images/main.png",
  },
  {
    name: "AU South",
    location: "Cabanatuan City",
    image: "/images/south.png",
  },
  {
    name: "AU San Jose",
    location: "San Jose City",
    image: "/images/sanjose.png",
  },
];

const AboutUsModal = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-us-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-[1180px] overflow-y-auto rounded-[24px] border border-[#d8dfd4] bg-[#f7f3e9] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl leading-none text-[#212C61] shadow-md transition hover:bg-[#FFD000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#212C61] focus-visible:ring-offset-2"
          aria-label="Close About Us"
        >
          ×
        </button>

        <div className="grid gap-8 p-6 md:p-9 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:p-12">
          <section className="flex min-w-0 flex-col">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.34em] text-[#245f49]">
              About Us
            </p>

            <h2
              id="about-us-modal-title"
              className="mt-4 text-[34px] font-light uppercase tracking-[0.12em] text-[#2e3130] sm:text-[42px]"
            >
              PHINMA
            </h2>
            <p className="-mt-1 font-serif text-[34px] italic leading-none text-[#245f49] sm:text-[43px]">
              Araullo University
            </p>
            <div className="mt-4 h-[2px] w-24 bg-[#245f49]" />

            <div className="mt-7 space-y-5 text-sm leading-6 text-[#646a66] sm:text-[15px]">
              <p>
                PHINMA Araullo University is a tertiary educational institution with campuses located in
                Cabanatuan, Nueva Ecija and San Jose that offers quality and affordable education. What
                started as a simple law school in 1950 is now a major educational institution that provides
                basic, tertiary education and professional studies to Novo Ecijanos.
              </p>

              <p>
                PHINMA AU is one of the nine-member schools under the PHINMA Education system. It was
                acquired in 2004 as part of PHINMA&apos;s thrust to provide better education to improve the
                lives of more Filipinos. Through PHINMA Education&apos;s management, we have been strengthening
                our academic programs and employing non-traditional approaches to learning.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { year: "1950", detail: "Founded as a law school" },
                { year: "2004", detail: "Acquired by PHINMA Education" },
                { year: "Today", detail: "3 campuses, 10,000+ students" },
              ].map((item) => (
                <div key={item.year} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfe9df] text-[#245f49]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-serif text-sm text-[#2e3130]">{item.year}</p>
                    <p className="mt-1 text-xs leading-5 text-[#737a75]">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid min-h-[420px] grid-cols-2 gap-3 sm:min-h-[500px]">
            <article className="group relative col-span-2 min-h-[250px] overflow-hidden rounded-md border border-[#d8dfd4] bg-[#dfe6dc] sm:min-h-[300px]">
              <img
                src={CAMPUSES[0].image}
                alt={CAMPUSES[0].name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-serif text-xl">{CAMPUSES[0].name}</h3>
                <p className="mt-0.5 text-xs text-white/90">{CAMPUSES[0].location}</p>
              </div>
            </article>

            {CAMPUSES.slice(1).map((campus) => (
              <article
                key={campus.name}
                className="group relative min-h-[180px] overflow-hidden rounded-md border border-[#d8dfd4] bg-[#dfe6dc] sm:min-h-[220px]"
              >
                <img
                  src={campus.image}
                  alt={campus.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white">
                  <h3 className="font-serif text-base sm:text-lg">{campus.name}</h3>
                  <p className="mt-0.5 text-[11px] text-white/90">{campus.location}</p>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutUsModal;
