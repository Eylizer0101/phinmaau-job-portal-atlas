import React, { useEffect, useState } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");
const OPTIONS = [
  ["all", "All Time"], ["today", "Today"], ["yesterday", "Yesterday"],
  ["thisWeek", "This Week"], ["7days", "Last 7 Days"], ["thisMonth", "This Month"],
  ["lastMonth", "Last Month"], ["thisYear", "This Year"], ["lastYear", "Last Year"],
  ["custom", "Custom Range"],
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CalendarIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
  </svg>
);
const toInput = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};
const atMidnight = (value) => new Date(`${value}T00:00:00`);
const labelDate = (value) => value ? atMidnight(value).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" }) : "Select date";

export const getApplicationDateRange = (value) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (value === "today") return { from: toInput(today), to: toInput(today) };
  if (value === "yesterday") { const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); return { from: toInput(day), to: toInput(day) }; }
  if (value === "thisWeek") { const offset = now.getDay() === 0 ? 6 : now.getDay() - 1; return { from: toInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)), to: toInput(today) }; }
  if (value === "7days") return { from: toInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: toInput(today) };
  if (value === "thisMonth") return { from: toInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toInput(today) };
  if (value === "lastMonth") return { from: toInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: toInput(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (value === "thisYear") return { from: toInput(new Date(now.getFullYear(), 0, 1)), to: toInput(today) };
  if (value === "lastYear") return { from: toInput(new Date(now.getFullYear() - 1, 0, 1)), to: toInput(new Date(now.getFullYear() - 1, 11, 31)) };
  return { from: "", to: "" };
};

export const isApplicationDateInRange = (value, from, to) => {
  if (!from && !to) return true;
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return false;
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (from && target < atMidnight(from).getTime()) return false;
  if (to && target > atMidnight(to).getTime()) return false;
  return true;
};

const Calendar = ({ monthDate, start, end, onPick, onMonth }) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const gridStart = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  const startDate = start ? atMidnight(start) : null;
  const endDate = end ? atMidnight(end) : null;
  const years = Array.from({ length: new Date().getFullYear() - 1949 }, (_, index) => 1950 + index);
  const move = (amount) => onMonth(new Date(year, month + amount, 1));
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button type="button" onClick={() => move(-1)} className="h-8 rounded-lg text-2xl text-slate-600 hover:bg-slate-100" aria-label="Previous month">‹</button>
        <div className="grid grid-cols-[1fr_92px] gap-2">
          <select value={month} onChange={(e) => onMonth(new Date(year, Number(e.target.value), 1))} className="h-10 rounded-lg border border-slate-200 px-2 text-center text-sm font-extrabold text-[#2e66a6]">{MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select>
          <select value={year} onChange={(e) => onMonth(new Date(Number(e.target.value), month, 1))} className="h-10 rounded-lg border border-slate-200 px-2 text-center text-sm font-extrabold text-[#2e66a6]">{years.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <button type="button" onClick={() => move(1)} className="h-8 rounded-lg text-2xl text-slate-600 hover:bg-slate-100" aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500">{["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => <div key={day}>{day}</div>)}</div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((day) => {
          const value = toInput(day); const outside = day.getMonth() !== month;
          const selected = (startDate && day.toDateString() === startDate.toDateString()) || (endDate && day.toDateString() === endDate.toDateString());
          const ranged = startDate && endDate && day >= startDate && day <= endDate;
          return <button type="button" key={value} onClick={() => onPick(value)} className={cn("flex h-10 items-center justify-center", outside ? "text-slate-300" : "text-slate-700", ranged && "bg-[#2e66a6]/10 text-[#2e66a6]", selected ? "rounded-lg bg-[#2e66a6] font-extrabold text-white shadow-md" : "hover:bg-[#2e66a6]/10")}>{day.getDate()}</button>;
        })}
      </div>
    </div>
  );
};

const RangeModal = ({ open, start, end, onCancel, onApply }) => {
  const today = toInput(new Date());
  const [draftStart, setDraftStart] = useState(start || today); const [draftEnd, setDraftEnd] = useState(end || today);
  const [left, setLeft] = useState(atMidnight(start || today)); const [right, setRight] = useState(atMidnight(end || today));
  useEffect(() => { if (open) { setDraftStart(start || today); setDraftEnd(end || today); setLeft(atMidnight(start || today)); setRight(atMidnight(end || today)); } }, [open, start, end, today]);
  if (!open) return null;
  const pick = (value) => { if (!draftStart || draftEnd) { setDraftStart(value); setDraftEnd(""); } else if (atMidnight(value) < atMidnight(draftStart)) { setDraftEnd(draftStart); setDraftStart(value); } else setDraftEnd(value); };
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true">
      <div className="max-h-[95vh] w-full max-w-[1150px] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="grid gap-6 px-7 pb-5 pt-7 md:grid-cols-[1fr_auto_1fr] md:items-end">
          {[['Start Date', draftStart], ['End Date', draftEnd]].map(([title, value], index) => <React.Fragment key={title}><div><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{title}</p><div className="flex h-16 items-center gap-4 rounded-xl bg-slate-100 px-6 text-2xl font-extrabold text-[#2e66a6]"><CalendarIcon className="h-6 w-6" />{labelDate(value)}</div></div>{index === 0 ? <div className="hidden pb-4 text-3xl text-slate-500 md:block">→</div> : null}</React.Fragment>)}
        </div>
        <div className="grid gap-10 px-7 pb-6 md:grid-cols-2"><Calendar monthDate={left} start={draftStart} end={draftEnd} onPick={pick} onMonth={setLeft} /><Calendar monthDate={right} start={draftStart} end={draftEnd} onPick={pick} onMonth={setRight} /></div>
        <div className="flex justify-end gap-5 border-t border-slate-100 px-7 py-5"><button type="button" onClick={onCancel} className="font-bold text-slate-600">Cancel</button><button type="button" disabled={!draftStart || !draftEnd} onClick={() => onApply(draftStart, draftEnd)} className="h-12 rounded-xl bg-[#2e66a6] px-10 font-extrabold text-white shadow-lg disabled:opacity-50">Apply Range</button></div>
      </div>
    </div>
  );
};

const ApplicationDateFilter = ({ value, dateFrom, dateTo, onChange }) => {
  const [open, setOpen] = useState(false); const [customOpen, setCustomOpen] = useState(false);
  useEffect(() => { if (!open) return undefined; const close = () => setOpen(false); window.addEventListener("click", close); return () => window.removeEventListener("click", close); }, [open]);
  const select = (next) => { if (next === "custom") { setOpen(false); setCustomOpen(true); return; } const range = getApplicationDateRange(next); onChange({ value: next, dateFrom: range.from, dateTo: range.to }); setOpen(false); };
  const label = value === "custom" && dateFrom && dateTo ? `${labelDate(dateFrom)} - ${labelDate(dateTo)}` : OPTIONS.find(([key]) => key === value)?.[1] || "All Time";
  return <div className="relative w-full"><button type="button" onClick={(e) => { e.stopPropagation(); setOpen((current) => !current); }} className="flex h-10 w-full items-center justify-between rounded-lg border border-[#d8e2ee] bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"><span className="truncate">{label}</span><CalendarIcon /></button>{open ? <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">{OPTIONS.map(([key, text]) => <button type="button" key={key} onClick={() => select(key)} className={cn("block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold", value === key ? "bg-[#2e66a6]/10 text-[#2e66a6]" : "text-gray-600 hover:bg-gray-50")}>{text}</button>)}</div> : null}<RangeModal open={customOpen} start={dateFrom} end={dateTo} onCancel={() => setCustomOpen(false)} onApply={(from, to) => { onChange({ value: "custom", dateFrom: from, dateTo: to }); setCustomOpen(false); }} /></div>;
};

export default ApplicationDateFilter;
