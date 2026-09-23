import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
const COLORS = ['#2e66a6', '#168477', '#b67a19', '#7c60ac', '#be5965', '#56758c', '#628539', '#ab663c'];
const value = v => v == null ? 'Unavailable' : String(v);
const context = report => [['PHINMA ARAULLO UNIVERSITY — AGAPAY'], ['Generated', new Date(report.generatedAt).toLocaleString('en-PH', {
  timeZone: 'Asia/Manila'
}), 'Asia/Manila'], ...Object.entries(report.filters).filter(([, v]) => Array.isArray(v) ? v.length : !!v).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])];
function canvasPage(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 1850;
  const c = canvas.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, 1400, 1850);
  c.fillStyle = '#2e66a6';
  c.fillRect(70, 70, 45, 6);
  c.font = '600 18px Arial';
  c.fillText('PHINMA ARAULLO UNIVERSITY  /  AGAPAY', 70, 115);
  c.fillStyle = '#172c45';
  c.font = '600 37px Arial';
  c.fillText(title, 70, 180);
  c.font = '19px Arial';
  c.fillStyle = '#667b92';
  c.fillText(subtitle, 70, 225);
  return {
    canvas,
    c,
    y: 285
  };
}
function wrap(c, text, x, y, maxWidth, lineHeight = 27) {
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (c.measureText(test).width > maxWidth && line) {
        c.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else line = test;
    }
    c.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}
function drawChart(c, item, rows, top) {
  const left = 410,
    right = 1270,
    width = right - left;
  const max = Math.max(1, ...rows.flatMap(r => item.series.map(s => Number(r[s]) || 0)));
  c.font = '17px Arial';
  if (item.type === 'line') {
    const bottom = top + 470;
    for (let tick = 0; tick <= 4; tick++) {
      const y = bottom - tick * 110;
      c.strokeStyle = '#e1e8f0';
      c.beginPath();
      c.moveTo(125, y);
      c.lineTo(right, y);
      c.stroke();
      c.fillStyle = '#62758a';
      c.fillText((max * tick / 4).toFixed(1), 72, y + 5);
    }
    item.series.forEach((s, i) => {
      c.strokeStyle = COLORS[i % COLORS.length];
      c.lineWidth = 4;
      let previous = null;
      rows.forEach((r, j) => {
        if (r[s] == null) {
          previous = null;
          return;
        }
        const x = 160 + j * (1080 / Math.max(1, rows.length - 1)),
          y = bottom - 440 * r[s] / max;
        if (previous) {
          c.beginPath();
          c.moveTo(...previous);
          c.lineTo(x, y);
          c.stroke();
        }
        c.fillStyle = COLORS[i % COLORS.length];
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.fill();
        previous = [x, y];
      });
    });
    rows.forEach((r, j) => {
      const x = 160 + j * (1080 / Math.max(1, rows.length - 1));
      c.save();
      c.translate(x, bottom + 20);
      c.rotate(-.5);
      c.fillStyle = '#52687e';
      c.fillText(r.name, 0, 0);
      c.restore();
    });
    return bottom + 100;
  }
  const rowHeight = Math.max(58, item.series.length * 23 + 17);
  rows.forEach((r, j) => {
    const y = top + j * rowHeight;
    c.font = '17px Arial';
    c.fillStyle = '#344d68';
    wrap(c, r.name, 75, y + 19, 310, 20);
    item.series.forEach((s, i) => {
      const yy = y + i * 23;
      const n = r[s];
      c.fillStyle = '#eef3f8';
      c.fillRect(left, yy, width, 15);
      if (n != null) {
        c.fillStyle = COLORS[i % COLORS.length];
        c.fillRect(left, yy, width * n / max, 15);
      }
      c.fillStyle = '#344d68';
      c.font = '15px Arial';
      c.fillText(value(n) + (n != null && item.unit === '%' ? '%' : ''), right + 12, yy + 13);
    });
  });
  return top + rows.length * rowHeight + 20;
}
export async function exportAnalyticsReport(report, sections, format, save = true) {
  const filename = `AGAPAY-Analytics-${report.generatedAt.slice(0, 10)}`;
  if (format === 'xlsx') {
    const workbook = XLSX.utils.book_new();
    sections.forEach(name => {
      const section = report.sections[name];
      const rows = [...context(report), [], ['GLOBAL METRICS'], ['Metric', 'Value', 'Unit', 'Definition'], ...report.global.map(m => [m.label, m.value == null ? 'Unavailable' : m.value, m.unit, m.definition]), [], ['SECTION METRICS'], ['Metric', 'Value', 'Unit', 'Definition'], ...section.metrics.map(m => [m.label, m.value == null ? 'Unavailable' : m.value, m.unit, m.definition])];
      section.charts.forEach(ch => rows.push([], [ch.title], [ch.note], ['Category', ...ch.series], ...ch.rows.map(r => [r.name, ...ch.series.map(s => r[s] == null ? 'Unavailable' : r[s])])));
      rows.push([], ['ANALYTICS RULES'], ...report.notes.map(n => [n]));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{
        wch: 48
      }, {
        wch: 24
      }, {
        wch: 20
      }, {
        wch: 110
      }];
      XLSX.utils.book_append_sheet(workbook, ws, name);
    });
    if (save) XLSX.writeFile(workbook, filename + '.xlsx');
    return workbook;
  }
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4'
  });
  let pages = 0;
  const subtitle = new Date(report.generatedAt).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila'
  }) + ' PHT';
  const add = page => {
    page.c.fillStyle = '#8494a6';
    page.c.font = '17px Arial';
    page.c.fillText(`AGAPAY  •  ${subtitle}  •  Page ${pages + 1}`, 70, 1790);
    if (pages++) pdf.addPage();
    pdf.addImage(page.canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 277.5);
  };
  let p = canvasPage('Analytics report', subtitle);
  p.c.font = '22px Arial';
  p.c.fillStyle = '#233c58';
  p.y = wrap(p.c, 'Included sections: ' + sections.join(', '), 70, p.y, 1250) + 25;
  for (const row of context(report).slice(2)) {
    p.c.font = '20px Arial';
    if (p.y > 1550) {
      add(p);
      p = canvasPage('Applied filters continued', subtitle);
    }
    p.y = wrap(p.c, row.join(': '), 70, p.y, 1250) + 8;
  }
  add(p);
  for (const name of sections) {
    p = canvasPage(name + ' — Key metrics', subtitle);
    for (const m of [...report.global, ...report.sections[name].metrics]) {
      p.c.font = '18px Arial';
      const lines = Math.ceil(p.c.measureText(m.definition).width / 1240) + 1;
      const h = 105 + lines * 25;
      if (p.y + h > 1690) {
        add(p);
        p = canvasPage(name + ' — Metrics continued', subtitle);
      }
      p.c.fillStyle = '#243f5d';
      p.c.font = '600 22px Arial';
      p.y = wrap(p.c, `${m.label}: ${value(m.value)}${m.value != null ? m.unit : ''}`, 70, p.y, 1250, 29) + 8;
      p.c.fillStyle = '#657a91';
      p.c.font = '18px Arial';
      p.y = wrap(p.c, m.definition, 70, p.y, 1250, 25) + 35;
    }
    add(p);
    p = canvasPage(name + ' — Charts', subtitle);
    for (const item of report.sections[name].charts) {
      const chunkSize = item.type === 'line' ? 12 : Math.max(1, Math.floor(850 / Math.max(58, item.series.length * 23 + 17)));
      const chunks = [];
      for (let i = 0; i < item.rows.length; i += chunkSize) chunks.push(item.rows.slice(i, i + chunkSize));
      if (!chunks.length) chunks.push([]);
      for (let ci = 0; ci < chunks.length; ci++) {
        const estimate = 260 + (item.type === 'line' ? 620 : Math.max(180, chunks[ci].length * Math.max(58, item.series.length * 23 + 17)));
        if (p.y + estimate > 1690 && p.y > 285) { add(p); p = canvasPage(name + ' — Charts', subtitle); }
        p.c.fillStyle = '#243f5d';
        p.c.font = '600 27px Arial';
        p.y = wrap(p.c, item.title + (chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : ''), 70, p.y, 1250, 35) + 20;
        p.c.fillStyle = '#63788f';
        p.c.font = '18px Arial';
        p.y = wrap(p.c, item.note || 'Values use the applied filters.', 70, p.y, 1250, 25) + 20;
        p.y = wrap(p.c, item.series.map((s, i) => `${i + 1}. ${s === 'value' ? 'Value' : s}`).join('    '), 70, p.y, 1250, 25) + 20;
        item.series.forEach((s, i) => {
          p.c.fillStyle = COLORS[i % COLORS.length];
          p.c.fillRect(70 + i * 28, p.y, 18, 8);
        });
        p.y += 40;
        if (chunks[ci].length) p.y = drawChart(p.c, item, chunks[ci], p.y);else {
          p.c.fillStyle = '#687d94';
          p.c.font = '25px Arial';
          p.c.fillText(item.note.startsWith('Unavailable') ? 'Data unavailable' : 'No matching data', 70, p.y + 90);
        }
        p.y += chunks[ci].length ? 65 : 200;
      }
    }
    add(p);
  }
  p = canvasPage('Analytics rules and data coverage', subtitle);
  p.c.font = '20px Arial';
  p.c.fillStyle = '#4e657e';
  for (const n of report.notes) {
    if (p.y > 1450) {
      add(p);
      p = canvasPage('Data coverage continued', subtitle);
      p.c.font = '20px Arial';
    }
    p.y = wrap(p.c, n, 70, p.y, 1250, 30) + 30;
  }
  add(p);
  if (save) pdf.save(filename + '.pdf');
  return pdf;
}
