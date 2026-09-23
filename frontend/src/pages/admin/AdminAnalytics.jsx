import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, SlidersHorizontal, X, ChevronDown, Info, ArrowUpRight, BarChart3 } from 'lucide-react';
import Select from 'react-select';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import api from '../../services/api';
import { exportAnalyticsReport } from '../../utils/analyticsExport';
import './AdminAnalytics.css';
const TABS = ['Overview', 'Applications', 'Job Offers', 'Verification'];
const COLORS = ['#2e66a6', '#168477', '#b67a19', '#7c60ac', '#be5965', '#56758c', '#628539', '#ab663c'];
const DATES = [['overall', 'All Time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['thisWeek', 'This Week'], ['lastWeek', 'Last Week'], ['thisMonth', 'This Month'], ['lastMonth', 'Last Month'], ['thisYear', 'This Year'], ['lastYear', 'Last Year'], ['specific', 'Specific Date'], ['range', 'Custom Range']];
const FIELDS = {
  campus: 'Campus',
  course: 'Course',
  yearGraduated: 'Year Graduated',
  role: 'Role',
  applicationStatus: 'Application Status',
  jobStatus: 'Job Status',
  industry: 'Industry',
  jobType: 'Job Type',
  workMode: 'Work Mode',
  educationLevel: 'Education Required',
  experienceLevel: 'Experience Level',
  verificationStatus: 'Verification Status',
  editRequestStatus: 'Request Edit Status'
};
const defaults = () => ({
  date: 'overall',
  startDate: '',
  endDate: '',
  specificDate: '',
  ...Object.fromEntries(Object.keys(FIELDS).map(k => [k, []]))
});
const stamp = v => new Date(v).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila',
  dateStyle: 'medium',
  timeStyle: 'short'
});
const format = v => v === null || v === undefined ? '—' : new Intl.NumberFormat('en-PH', {
  maximumFractionDigits: 2
}).format(v);
const params = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Array.isArray(v) ? v.join('|') : v]));
function Metric({
  item,
  index
}) {
  return <article className="aa-metric"><div className="aa-metric-top"><span>{item.label}</span><details className="aa-definition"><summary aria-label={`Definition of ${item.label}`}><Info size={16} /></summary><p>{item.definition}</p></details></div><div className="aa-value">{format(item.value)}<small>{item.value !== null ? item.unit : ''}</small></div><div className="aa-metric-foot"><i style={{
        background: COLORS[index % COLORS.length]
      }} />{item.value === null ? 'Data unavailable' : 'Based on applied filters'}</div></article>;
}
function ChartCard({
  item
}) {
  const horizontal = item.type === 'horizontal';
  const height = horizontal ? Math.max(290, item.rows.length * 39) : 320;
  const hasValues = item.rows.some(r => item.series.some(s => typeof r[s] === 'number'));
  const props = {
    data: item.rows,
    margin: {
      top: 18,
      right: 24,
      bottom: 20,
      left: horizontal ? 8 : 0
    }
  };
  const common = <><CartesianGrid stroke="#e7edf3" strokeDasharray="3 4" vertical={false} /><XAxis type={horizontal ? 'number' : 'category'} dataKey={horizontal ? undefined : 'name'} tick={{
      fontSize: 11,
      fill: '#596b7f'
    }} axisLine={false} tickLine={false} interval="preserveStartEnd" /><YAxis type={horizontal ? 'category' : 'number'} dataKey={horizontal ? 'name' : undefined} width={horizontal ? 180 : 48} tick={{
      fontSize: 11,
      fill: '#596b7f'
    }} axisLine={false} tickLine={false} allowDecimals={item.unit === '%'} /><Tooltip contentStyle={{
      borderRadius: 12,
      border: '1px solid #dce5ee',
      fontSize: 12
    }} formatter={(value, name) => [`${format(value)}${item.unit === '%' ? '%' : ''}`, name === 'value' ? item.unit === '%' ? 'Rate' : 'Count' : name]} />{item.series.length > 1 && <Legend wrapperStyle={{
      fontSize: 12,
      paddingTop: 16
    }} />}</>;
  return <article className={`aa-chart ${item.type === 'line' ? 'aa-chart-wide' : ''}`}><header><div><h3>{item.title}</h3><p>{item.unit === '%' ? 'Percentage (%)' : item.unit === 'salary' ? 'Comparable salary data required' : 'Recorded activity'}</p></div><BarChart3 size={18} /></header>{hasValues ? <div className="aa-plot-scroll"><div style={{
        height,
        minWidth: !horizontal && item.rows.length > 10 ? item.rows.length * 65 : 0
      }}><ResponsiveContainer width="100%" height="100%">{item.type === 'line' ? <LineChart {...props}>{common}{item.series.map((s, i) => <Line key={s} type="linear" dataKey={s} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{
              r: 3
            }} activeDot={{
              r: 5
            }} connectNulls={false} />)}</LineChart> : item.type === 'funnel' ? <FunnelChart><Tooltip formatter={v => format(v)} /><Funnel dataKey="value" data={item.rows} isAnimationActive={false}>{item.rows.map((r, i) => <Cell key={r.name} fill={COLORS[i % COLORS.length]} />)}<LabelList position="right" dataKey="name" fill="#334155" fontSize={12} /><LabelList position="center" dataKey="value" fill="#fff" fontSize={14} /></Funnel></FunnelChart> : <BarChart {...props} layout={horizontal ? 'vertical' : 'horizontal'} barCategoryGap="25%">{common}{item.series.map((s, i) => <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={item.type === 'stacked' ? [0, 0, 0, 0] : [3, 3, 3, 3]} maxBarSize={34} stackId={item.type === 'stacked' ? 'total' : undefined} />)}</BarChart>}</ResponsiveContainer></div></div> : <div className="aa-empty"><BarChart3 size={28} /><strong>{item.note.startsWith('Unavailable') ? 'Data unavailable' : 'No matching data'}</strong><span>{item.note.startsWith('Unavailable') ? 'See the data requirement below.' : 'Try a different date range or filter.'}</span></div>}{item.note && <p className="aa-chart-note">{item.note}</p>}<details className="aa-data"><summary>View data table</summary><div className="aa-table-scroll"><table><thead><tr><th>Category</th>{item.series.map(s => <th key={s}>{s === 'value' ? 'Value' : s}</th>)}</tr></thead><tbody>{item.rows.map((r, i) => <tr key={i}><td>{r.name}</td>{item.series.map(s => <td key={s}>{format(r[s])}{r[s] != null && item.unit === '%' ? '%' : ''}</td>)}</tr>)}</tbody></table></div></details></article>;
}
function ExportModal({
  report,
  onClose,
  onExport,
  busy,
  error
}) {
  const [selected, setSelected] = useState([...TABS]);
  const [format, setFormat] = useState('xlsx');
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button')?.focus();
    const handler = e => {
      if (e.key === 'Escape' && !busy) closeRef.current();
      if (e.key === 'Tab') {
        const nodes = ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled)');
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, [busy]);
  return <div className="aa-overlay" onMouseDown={e => {
    if (e.target === e.currentTarget && !busy) onClose();
  }}><section ref={ref} className="aa-modal" role="dialog" aria-modal="true" aria-labelledby="aa-export-title"><header><div><span className="aa-eyebrow">REPORT DOWNLOAD</span><h2 id="aa-export-title">Export your analytics</h2></div><button className="aa-icon" onClick={onClose} disabled={busy} aria-label="Close export modal"><X /></button></header><p>Select the sections and file format to include.</p><fieldset disabled={busy}><legend>Sections</legend>{TABS.map((t, i) => <label className="aa-check" key={t}><input type="checkbox" checked={selected.includes(t)} onChange={() => setSelected(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} /><span><strong>{t}</strong><small>{['System activity and campus outcomes', 'Recruitment and application behavior', 'Job supply and edit activity', 'Verification status and processing'][i]}</small></span></label>)}</fieldset><fieldset className="aa-formats" disabled={busy}><legend>File format</legend>{[['xlsx', 'Excel workbook', '.xlsx · One worksheet per section'], ['pdf', 'PDF report', '.pdf · KPIs, charts and filter context']].map(([v, label, note]) => <label key={v}><input type="radio" name="exportFormat" value={v} checked={format === v} onChange={() => setFormat(v)} /><span><strong>{label}</strong><small>{note}</small></span></label>)}</fieldset><p className="aa-context">Uses the displayed snapshot: {stamp(report.generatedAt)} PHT. Applied filters are included.</p>{error && <p role="alert" className="aa-error">{error}</p>}<footer><button onClick={onClose} disabled={busy}>Cancel</button><button className="aa-primary" disabled={busy || !selected.length} onClick={() => onExport(selected, format)}><Download size={16} />{busy ? 'Preparing…' : 'Download Export'}</button></footer></section></div>;
}
export default function AdminAnalytics() {
  const [draft, setDraft] = useState(defaults),
    [applied, setApplied] = useState(defaults),
    [report, setReport] = useState(null),
    [tab, setTab] = useState('Overview'),
    [advanced, setAdvanced] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [modal, setModal] = useState(false),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState(''),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get('/admin/analytics', {
      params: params(applied),
      signal: controller.signal
    }).then(r => {
      if (!controller.signal.aborted) setReport(r.data);
    }).catch(e => {
      if (!controller.signal.aborted) setError(e.response?.data?.message || 'Unable to load analytics. Please try again.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [applied, reload]);
  const apply = e => {
    e.preventDefault();
    if (draft.date === 'range' && (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate)) {
      setError('Choose a valid start and end date.');
      return;
    }
    if (draft.date === 'specific' && !draft.specificDate) {
      setError('Choose a date.');
      return;
    }
    setApplied({
      ...draft
    });
  };
  const clear = () => {
    const f = defaults();
    setDraft(f);
    setApplied(f);
  };
  const download = async (selected, format) => {
    setExporting(true);
    setExportError('');
    try {
      await api.post('/admin/analytics/export-log', {
        sections: selected,
        format,
        filters: report.filters,
        generatedAt: report.generatedAt
      });
      await exportAnalyticsReport(report, selected, format);
      setModal(false);
    } catch (e) {
      setExportError(e.response?.data?.message || 'Unable to export the report. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  const section = report?.sections?.[tab];
  const changed = JSON.stringify(draft) !== JSON.stringify(applied);
  const select = k => <label key={k} className="aa-field"><span id={`aa-label-${k}`}>{FIELDS[k]}</span><Select inputId={`aa-${k}`} aria-labelledby={`aa-label-${k}`} isMulti closeMenuOnSelect={false} options={(report?.options?.[k] || []).map(v => ({
      value: v,
      label: v
    }))} value={draft[k].map(v => ({
      value: v,
      label: v
    }))} onChange={v => setDraft(f => ({
      ...f,
      [k]: v.map(x => x.value)
    }))} placeholder="All" classNamePrefix="aa-select" /></label>;
  return <main className="aa-page"><header className="aa-heading"><div><span className="aa-eyebrow">PHINMA ARAULLO UNIVERSITY</span><h1>Reports &amp; Analytics</h1><p>Understand activity. Follow outcomes. Make informed decisions.</p></div><div className="aa-actions"><button onClick={() => setReload(x => x + 1)} disabled={loading}><RefreshCw size={16} className={loading ? 'aa-spin' : ''} />Refresh</button><button className="aa-primary" onClick={() => {
          setExportError('');
          setModal(true);
        }} disabled={loading || !!error || !report}><Download size={16} />Export Reports</button></div></header>
 <form className="aa-filters" onSubmit={apply}><div className="aa-filter-title"><strong><SlidersHorizontal size={16} /> Filter analytics</strong><span>Philippine time · UTC+08:00</span></div><div className="aa-filter-grid"><label className="aa-field"><span>Date Range</span><select value={draft.date} onChange={e => setDraft(f => ({
            ...f,
            date: e.target.value
          }))}>{DATES.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label>{['campus', 'course', 'role'].map(select)}</div>{draft.date === 'specific' && <label className="aa-field aa-date"><span>Specific Date</span><input type="date" required value={draft.specificDate} onChange={e => setDraft(f => ({
          ...f,
          specificDate: e.target.value
        }))} /></label>}{draft.date === 'range' && <div className="aa-date-row">{['startDate', 'endDate'].map(k => <label className="aa-field" key={k}><span>{k === 'startDate' ? 'Start Date' : 'End Date'}</span><input type="date" required value={draft[k]} min={k === 'endDate' ? draft.startDate : undefined} onChange={e => setDraft(f => ({
            ...f,
            [k]: e.target.value
          }))} /></label>)}</div>}{advanced && <div className="aa-filter-grid aa-advanced">{Object.keys(FIELDS).filter(k => !['campus', 'course', 'role'].includes(k)).map(select)}</div>}<div className="aa-filter-bottom"><button type="button" className="aa-text" onClick={() => setAdvanced(x => !x)} aria-expanded={advanced}><ChevronDown size={16} />{advanced ? 'Fewer filters' : 'More filters'}</button><div><span className="aa-pending">{changed ? 'Unapplied changes' : ''}</span><button type="button" onClick={clear}>Clear All</button><button className="aa-primary" type="submit" disabled={loading}>Apply Filters <ArrowUpRight size={15} /></button></div></div><div className="aa-chips"><span>{DATES.find(([v]) => v === applied.date)?.[1]}{applied.date === 'range' ? `: ${applied.startDate} – ${applied.endDate}` : applied.date === 'specific' ? `: ${applied.specificDate}` : ''}</span>{Object.keys(FIELDS).flatMap(k => applied[k].map(v => <span key={`${k}-${v}`}>{FIELDS[k]}: {v}</span>))}</div></form>
 {error && <div className="aa-error" role="alert">{error}<button onClick={() => setReload(x => x + 1)}>Retry</button></div>}
 {loading ? <div className="aa-skeleton" role="status"><span>Loading analytics…</span><div /><div /><div /></div> : !error && report && <><div className="aa-global">{report.global.map((m, i) => <Metric key={m.label} item={m} index={i} />)}</div><div className="aa-tabs" role="tablist" aria-label="Analytics sections">{TABS.map((t, i) => <button role="tab" id={`aa-tab-${i}`} aria-selected={tab === t} aria-controls="aa-panel" tabIndex={tab === t ? 0 : -1} key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} onKeyDown={e => {
          let n;
          if (e.key === 'ArrowRight') n = (i + 1) % 4;
          if (e.key === 'ArrowLeft') n = (i + 3) % 4;
          if (e.key === 'Home') n = 0;
          if (e.key === 'End') n = 3;
          if (n !== undefined) {
            e.preventDefault();
            setTab(TABS[n]);
            document.getElementById(`aa-tab-${n}`)?.focus();
          }
        }}>{t}</button>)}</div><section id="aa-panel" role="tabpanel" aria-labelledby={`aa-tab-${TABS.indexOf(tab)}`}><div className="aa-section-heading"><div><h2>{tab === 'Overview' ? 'Your portal at a glance' : tab}</h2><p>{report.range.label === 'Overall' ? 'All Time' : report.range.label} · Current outcomes within the selected population</p></div><span className="aa-live"><i />Database snapshot</span></div>{section?.metrics.length > 0 && <div className="aa-section-metrics">{section.metrics.map((m, i) => <Metric key={m.label} item={m} index={i} />)}</div>}<div className="aa-charts">{section?.charts.map(c => <ChartCard key={c.title} item={c} />)}</div></section><details className="aa-rules"><summary><Info size={16} />Analytics definitions and data coverage</summary>{report.notes.map(n => <p key={n}>{n}</p>)}</details><footer className="aa-footer">Updated {stamp(report.generatedAt)} PHT · Refresh to load new activity</footer></>}
 {modal && report && <ExportModal report={report} onClose={() => setModal(false)} onExport={download} busy={exporting} error={exportError} />}
 </main>;
}
