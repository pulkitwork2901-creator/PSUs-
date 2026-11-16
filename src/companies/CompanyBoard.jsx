import { useEffect, useMemo, useState } from 'react';
import '../shared/board.css';
import '../shared/frame.css';
import '../psu/psu.css';
import './companies.css';
import useIndicators from '../shared/useIndicators.js';
import { PairBars, YearBars } from '../psu/charts.jsx';
import LineChart from './LineChart.jsx';
import Tabs from '../psu/Tabs.jsx';

// Maharatna company financials: ten years of each company's own audited
// figures, read from its annual reports. Reads
// public/data/companies/maharatna-financials.json; every value carries the
// report and page it came from.

const SKINS = [
  { id: 'teal', label: 'Teal' },
  { id: 'saffron', label: 'Saffron' },
  { id: 'dark', label: 'Dark' },
];
function readSkin() {
  try {
    const s = localStorage.getItem('ps-skin');
    if (SKINS.some((k) => k.id === s)) return s;
  } catch { /* storage blocked */ }
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'teal'; } catch { return 'teal'; }
}

const nf = (d = 0) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const minus = (s) => String(s).replace(/^-/, '−');
const crore = (v) => (v == null ? 'n/a' : minus(nf(0).format(v)));
const rs = (v) => (v == null ? 'n/a' : (v < 0 ? '−₹' : '₹') + nf(0).format(Math.abs(v)) + ' crore');
const pctTxt = (v, d = 1) => (v == null || !Number.isFinite(v) ? 'n/a' : `${minus(nf(d).format(v))}%`);
const times = (v) => (v == null || !Number.isFinite(v) ? 'n/a' : `${nf(2).format(v)}×`);
const short = (y) => y.replace(/^20(\d\d)-(\d\d)$/, '$1-$2');
const growth = (a, b) => (a != null && b != null && b !== 0 ? (100 * (a - b)) / Math.abs(b) : null);
const moved = (p) => (p == null ? 'unchanged' : p > 0 ? `up ${nf(1).format(p)}%` : p < 0 ? `down ${nf(1).format(-p)}%` : 'unchanged');
const cagr = (first, last, n) => (first > 0 && last > 0 && n > 0 ? 100 * ((last / first) ** (1 / n) - 1) : null);

// Ratios worked out from the reported amounts, the same way for every company.
function derive(c) {
  const s = c.series;
  const years = [...new Set(Object.values(s).flatMap((v) => Object.keys(v)))].sort();
  const get = (m, y) => (s[m] ? s[m][y] ?? null : null);
  const r = { years, pat_margin: {}, ebitda_margin: {}, roe: {}, de: {}, payout: {} };
  years.forEach((y, i) => {
    const rev = get('revenue', y);
    const pat = get('pat', y);
    const nw = get('net_worth', y);
    const prevNw = i > 0 ? get('net_worth', years[i - 1]) : null;
    r.pat_margin[y] = rev && pat != null ? (100 * pat) / rev : null;
    r.ebitda_margin[y] = rev && get('ebitda', y) != null ? (100 * get('ebitda', y)) / rev : null;
    const avgNw = nw != null && prevNw != null ? (nw + prevNw) / 2 : nw;
    r.roe[y] = pat != null && avgNw ? (100 * pat) / avgNw : null;
    r.de[y] = get('borrowings', y) != null && nw ? get('borrowings', y) / nw : null;
    r.payout[y] = get('dividend', y) != null && pat > 0 ? (100 * get('dividend', y)) / pat : null;
  });
  return r;
}

const LABELS = {
  revenue: 'Revenue', ebitda: 'EBITDA', pbt: 'Profit before tax', pat: 'Profit after tax', net_worth: 'Net worth', borrowings: 'Borrowings',
  dividend: 'Dividend (total)', capex: 'Capital expenditure', exchequer: 'Paid to the exchequer', employees: 'Employees',
};

function Tile({ label, value, unit, pill, foot }) {
  return (
    <li className="eb-tile">
      <span className="eb-tile-link">
        <span className="eb-tile-label">{label}</span>
        <span className="eb-tile-value">{value}<span className="eb-tile-unit">{unit}</span></span>
      </span>
      {pill && <span className="eb-tile-change">{pill}</span>}
      <span className="eb-tile-period">{foot}</span>
    </li>
  );
}
function Change({ now, before, suffix }) {
  const p = growth(now, before);
  if (p == null) return null;
  const tone = p > 0 ? 'good' : p < 0 ? 'bad' : 'neutral';
  return <span className={`eb-chip eb-${tone}`}><span aria-hidden="true">{p > 0 ? '▲' : p < 0 ? '▼' : '▬'}</span> {p > 0 ? '+' : p < 0 ? '−' : ''}{nf(1).format(Math.abs(p))}%{suffix}</span>;
}

function sourceTitle(c, m, y) {
  const i = c.cell_source?.[m]?.[y];
  if (i == null) return undefined;
  const s = c.sources[i];
  const page = s.pages.length === 1 ? s.pages[0] : s.pages.join(', ');
  return `${s.report}, PDF page ${page}`;
}

function Summary({ c, d }) {
  const ys = d.years;
  const first = ys[0];
  const last = ys[ys.length - 1];
  const prev = ys[ys.length - 2];
  const rev = c.series.revenue || {};
  const pat = c.series.pat || {};
  const n = ys.length - 1;
  const g = cagr(rev[first], rev[last], n);
  const gp = cagr(pat[first], pat[last], n);
  const avgRoe = ys.map((y) => d.roe[y]).filter((v) => v != null);
  const lossYears = ys.filter((y) => pat[y] < 0);
  const de = d.de[last];
  const dePrev = d.de[first];
  return (
    <p className="ps-say">
      {({ OIL: 'Oil India', CIL: 'Coal India' })[c.short] || c.short}'s {c.revenue_label.split(' (')[0].toLowerCase()} went from {rs(rev[first])} in {first} to <b>{rs(rev[last])}</b> in {last}
      {g != null ? <>, {nf(1).format(g)}% a year</> : ''}. Profit after tax was <b>{rs(pat[last])}</b> in {last}, {moved(growth(pat[last], pat[prev]))} on {prev}
      {gp != null ? <> and {gp >= 0 ? 'up' : 'down'} {nf(1).format(Math.abs(gp))}% a year since {first}</> : ''}
      {lossYears.length ? <>; it made a loss in {lossYears.length > 1 ? `${lossYears.slice(0, -1).join(', ')} and ${lossYears[lossYears.length - 1]}` : lossYears[0]}</> : ''}.
      {' '}Return on equity was {pctTxt(d.roe[last])} in {last}{avgRoe.length > 2 ? <> against a {n + 1}-year average of {pctTxt(avgRoe.reduce((a, b) => a + b, 0) / avgRoe.length)}</> : ''}.
      {de != null && <> Borrowings were {times(de)} net worth{dePrev != null ? <> ({times(dePrev)} in {first})</> : ''}.</>}
      {d.payout[last] != null && <> It paid {pctTxt(d.payout[last], 0)} of its {last} profit as dividend.</>}
    </p>
  );
}

function CompanyView({ c }) {
  const d = useMemo(() => derive(c), [c]);
  const ys = d.years;
  const last = ys[ys.length - 1];
  const prev = ys[ys.length - 2];
  const S = c.series;
  const has = (m) => S[m] && Object.keys(S[m]).length > 0;
  const rows = (keys) => ys.map((y) => Object.fromEntries([['period', y], ['short', short(y)], ...keys.map((k) => [k, S[k]?.[y] ?? null])]));
  const fmtCr = (v, axis) => (v == null ? 'n/a' : axis ? minus(nf(0).format(v / 1000)) : rs(v));
  const fmtPct = (v, axis) => (v == null || !Number.isFinite(v) ? 'n/a' : axis ? `${nf(0).format(v)}%` : pctTxt(v));
  const fmtX = (v, axis) => (v == null || !Number.isFinite(v) ? 'n/a' : axis ? nf(1).format(v) : times(v));
  const tableRows = [
    ...['revenue', 'ebitda', 'pbt', 'pat', 'net_worth', 'borrowings', 'dividend', 'capex', 'exchequer', 'employees'].filter(has).map((m) => ({ m, label: m === 'revenue' ? `Revenue (${c.revenue_label})` : m === 'borrowings' && c.borrowings_label ? `Borrowings (${c.borrowings_label})` : LABELS[m], kind: m === 'employees' ? 'n' : 'cr' })),
    { m: 'ebitda_margin', label: 'EBITDA margin', kind: 'pct', derived: true },
    { m: 'pat_margin', label: 'Profit margin (profit after tax / revenue)', kind: 'pct', derived: true },
    { m: 'roe', label: 'Return on equity (profit after tax / average net worth)', kind: 'pct', derived: true },
    { m: 'de', label: 'Debt to equity (borrowings / net worth)', kind: 'x', derived: true },
    { m: 'payout', label: 'Dividend payout (dividend / profit after tax)', kind: 'pct', derived: true },
  ].filter((r) => !r.derived || ys.some((y) => d[r.m][y] != null));
  const cell = (r, y) => {
    const v = r.derived ? d[r.m][y] : S[r.m]?.[y];
    if (v == null) return '·';
    if (r.kind === 'pct') return pctTxt(v);
    if (r.kind === 'x') return nf(2).format(v);
    if (r.kind === 'n') return nf(0).format(v);
    return crore(v);
  };

  return (
    <section className="rb-section" aria-labelledby="co-h">
      <div className="co-head">
        <div>
          <h2 className="co-name" id="co-h">{c.name}</h2>
          <p className="co-meta">{c.sector} · {c.ministry} · <span className={`co-basis co-basis-${c.basis.toLowerCase()}`}>{c.basis} accounts</span> · {ys[0]} to {last}</p>
        </div>
      </div>
      <Summary c={c} d={d} />
      <ul className="eb-tiles co-tiles">
        <Tile label={`Revenue, ${last}`} value={crore(S.revenue?.[last])} unit="₹ crore" pill={<Change now={S.revenue?.[last]} before={S.revenue?.[prev]} suffix={` on ${prev}`} />} foot={c.revenue_label} />
        <Tile label={`Profit after tax, ${last}`} value={crore(S.pat?.[last])} unit="₹ crore" pill={<Change now={S.pat?.[last]} before={S.pat?.[prev]} suffix={` on ${prev}`} />} foot={`Profit before tax ${rs(S.pbt?.[last])}`} />
        <Tile label="Profit margin" value={nf(1).format(d.pat_margin[last] ?? 0)} unit="%" foot={`${pctTxt(d.pat_margin[prev])} in ${prev}`} />
        <Tile label="Return on equity" value={nf(1).format(d.roe[last] ?? 0)} unit="%" foot={`${pctTxt(d.roe[prev])} in ${prev}`} />
        {d.de[last] != null
          ? <Tile label="Debt to equity" value={nf(2).format(d.de[last])} unit="×" foot={`${times(d.de[prev])} in ${prev}`} />
          : <Tile label={`Net worth, ${last}`} value={crore(S.net_worth?.[last])} unit="₹ crore" foot={`${rs(S.net_worth?.[prev])} in ${prev}`} />}
        {has('dividend')
          ? <Tile label={`Dividend, ${last}`} value={crore(S.dividend[last])} unit="₹ crore" foot={d.payout[last] != null ? `${pctTxt(d.payout[last], 0)} of profit` : 'total, all shareholders'} />
          : <Tile label={`Net worth, ${last}`} value={crore(S.net_worth?.[last])} unit="₹ crore" foot={`${rs(S.net_worth?.[prev])} in ${prev}`} />}
      </ul>

      <div className="rb-grid-2">
        <figure className="eb-mc">
          <figcaption>
            <h3 className="eb-mc-title">Revenue</h3>
            <p className="eb-mc-note">₹ thousand crore. {c.revenue_label}.</p>
          </figcaption>
          <YearBars rows={rows(['revenue'])} series={[{ key: 'revenue', label: 'Revenue', color: 'var(--eb-s1)' }]} fmt={fmtCr} label={`${c.short} revenue by year`} />
        </figure>
        <figure className="eb-mc">
          <figcaption>
            <h3 className="eb-mc-title">Profit</h3>
            <ul className="eb-mc-legend"><li><i style={{ background: 'var(--eb-s3)' }} />Profit after tax</li>{has('pbt') && <li><i style={{ background: 'var(--eb-navy)', height: 3 }} />Profit before tax</li>}</ul>
            <p className="eb-mc-note">₹ thousand crore.</p>
          </figcaption>
          <YearBars rows={rows(['pat', 'pbt'])} series={[{ key: 'pat', label: 'Profit after tax', color: 'var(--eb-s3)' }]} dot={has('pbt') ? { key: 'pbt', label: 'Profit before tax' } : null} fmt={fmtCr} label={`${c.short} profit by year`} />
        </figure>
        <figure className="eb-mc">
          <figcaption>
            <h3 className="eb-mc-title">Margins and return on equity</h3>
            <ul className="eb-mc-legend">
              {ys.some((y) => d.ebitda_margin[y] != null) && <li><i style={{ background: 'var(--eb-s2)' }} />EBITDA margin</li>}
              <li><i style={{ background: 'var(--eb-s3)' }} />Profit margin</li>
              <li><i style={{ background: 'var(--eb-s1)' }} />Return on equity</li>
            </ul>
            <p className="eb-mc-note">Per cent. Worked out by the board from the reported amounts, the same way for every company.</p>
          </figcaption>
          <LineChart years={ys} fmt={fmtPct} label={`${c.short} margins and return on equity`} series={[
            ...(ys.some((y) => d.ebitda_margin[y] != null) ? [{ key: 'em', label: 'EBITDA margin', color: 'var(--eb-s2)', values: d.ebitda_margin }] : []),
            { key: 'pm', label: 'Profit margin', color: 'var(--eb-s3)', values: d.pat_margin },
            { key: 'roe', label: 'Return on equity', color: 'var(--eb-s1)', values: d.roe },
          ]} />
        </figure>
        <figure className="eb-mc">
          <figcaption>
            <h3 className="eb-mc-title">{has('borrowings') ? 'Net worth and borrowings' : 'Net worth'}</h3>
            <ul className="eb-mc-legend"><li><i style={{ background: 'var(--eb-s1)' }} />Net worth</li>{has('borrowings') && <li><i style={{ background: 'var(--eb-s2)' }} />Borrowings</li>}</ul>
            <p className="eb-mc-note">₹ crore, end of each year.{has('borrowings') ? ` Borrowings: ${c.borrowings_label}.` : ''}</p>
          </figcaption>
          <PairBars rows={rows(['net_worth', 'borrowings'])} series={[{ key: 'net_worth', label: 'Net worth', color: 'var(--eb-s1)' }, ...(has('borrowings') ? [{ key: 'borrowings', label: 'Borrowings', color: 'var(--eb-s2)' }] : [])]} fmt={(v) => rs(v)} />
        </figure>
        {has('dividend') && (
          <figure className="eb-mc">
            <figcaption>
              <h3 className="eb-mc-title">Dividend and profit</h3>
              <ul className="eb-mc-legend"><li><i style={{ background: 'var(--eb-data-quiet)' }} />Profit after tax</li><li><i style={{ background: 'var(--eb-s1)' }} />Dividend</li></ul>
              <p className="eb-mc-note">₹ crore. Total dividend for the year to all shareholders, of which the Government receives its share.</p>
            </figcaption>
            <PairBars rows={rows(['pat', 'dividend']).map((r) => ({ ...r, pat: Math.max(0, r.pat ?? 0) }))} series={[{ key: 'pat', label: 'Profit after tax (losses shown as zero)', color: 'var(--eb-data-quiet)' }, { key: 'dividend', label: 'Dividend', color: 'var(--eb-s1)' }]} fmt={(v) => rs(v)} />
          </figure>
        )}
        {(has('capex') || has('exchequer') || has('employees')) && (
          <figure className="eb-mc">
            <figcaption>
              <h3 className="eb-mc-title">{has('capex') ? 'Capital expenditure' : has('exchequer') ? 'Paid to the exchequer' : 'Employees'}</h3>
              <p className="eb-mc-note">{has('capex') ? '₹ thousand crore, as reported in the multi-year table.' : has('exchequer') ? '₹ thousand crore: taxes, duties, royalty, dividend and other levies paid to the Centre and states.' : 'Number on the rolls at year end.'}</p>
            </figcaption>
            {has('capex')
              ? <YearBars rows={rows(['capex'])} series={[{ key: 'capex', label: 'Capital expenditure', color: 'var(--eb-s2)' }]} fmt={fmtCr} label={`${c.short} capital expenditure`} />
              : has('exchequer')
                ? <YearBars rows={rows(['exchequer'])} series={[{ key: 'exchequer', label: 'Paid to the exchequer', color: 'var(--eb-s3)' }]} fmt={fmtCr} label={`${c.short} contribution to the exchequer`} />
                : <YearBars rows={rows(['employees'])} series={[{ key: 'employees', label: 'Employees', color: 'var(--eb-s1)' }]} fmt={(v, axis) => (v == null ? 'n/a' : axis ? nf(0).format(v / 1000) + 'k' : nf(0).format(v))} label={`${c.short} employees`} />}
          </figure>
        )}
        {d.de && ys.some((y) => d.de[y] != null) && (
          <figure className="eb-mc">
            <figcaption>
              <h3 className="eb-mc-title">Debt to equity</h3>
              <p className="eb-mc-note">Borrowings divided by net worth, times.</p>
            </figcaption>
            <LineChart years={ys} fmt={fmtX} label={`${c.short} debt to equity`} series={[{ key: 'de', label: 'Debt to equity', color: 'var(--eb-s2)', values: d.de }]} />
          </figure>
        )}
      </div>

      <h3 className="rb-sub">All figures, {ys[0]} to {last}</h3>
      <div className="eb-tablewrap eb-card ps-tablecard">
        <table className="eb-table ps-table co-table">
          <caption className="ps-caption">₹ crore unless shown. Point at a figure to see the report and page it comes from. Ratios in the lower rows are worked out by the board.</caption>
          <thead><tr><th scope="col">Measure</th>{ys.map((y) => <th key={y} scope="col" className="ps-num">{short(y)}</th>)}</tr></thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.m} className={r.derived ? 'co-derived' : undefined}>
                <th scope="row">{r.label}</th>
                {ys.map((y) => <td key={y} className={`ps-num ${(r.derived ? d[r.m][y] : S[r.m]?.[y]) < 0 ? 'eb-bad' : ''}`} title={r.derived ? 'Worked out by the board' : sourceTitle(c, r.m, y)}>{cell(r, y)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="eb-card rb-sources co-sources">
        <p className="co-src-h">Sources</p>
        <ol>
          {c.sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.report}</a> (PDF page{s.pages.length > 1 ? 's' : ''} {s.pages.join(', ')})</li>
          ))}
        </ol>
        {c.notes.length > 0 && <ul className="co-notes">{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      </div>
    </section>
  );
}

const CMP = [
  { key: 'revenue', label: 'Revenue', fmt: crore },
  { key: 'pat', label: 'Profit after tax', fmt: crore },
  { key: 'pat_margin', label: 'Profit margin', fmt: (v) => pctTxt(v) },
  { key: 'roe', label: 'Return on equity', fmt: (v) => pctTxt(v) },
  { key: 'de', label: 'Debt to equity', fmt: (v) => (v == null ? '·' : nf(2).format(v)) },
  { key: 'payout', label: 'Dividend payout', fmt: (v) => pctTxt(v, 0) },
  { key: 'pat_cagr', label: 'Profit growth a year (5 years)', fmt: (v) => pctTxt(v) },
];

function Compare({ companies, onPick, current }) {
  const [sort, setSort] = useState({ key: 'pat', dir: -1 });
  const rowsData = companies.map((c) => {
    const d = derive(c);
    const y = d.years[d.years.length - 1];
    const y5 = d.years[d.years.length - 6];
    return { c, y, revenue: c.series.revenue?.[y], pat: c.series.pat?.[y], pat_margin: d.pat_margin[y], roe: d.roe[y], de: d.de[y], payout: d.payout[y],
      pat_cagr: y5 ? cagr(c.series.pat?.[y5], c.series.pat?.[y], 5) : null };
  }).sort((a, b) => sort.dir * (((a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity)) || 0));
  return (
    <section className="rb-section" aria-labelledby="cmp-h">
      <div className="eb-eyebar"><h2 className="eb-eyebrow" id="cmp-h">All Maharatnas side by side, latest year</h2></div>
      <div className="eb-tablewrap eb-card ps-tablecard">
        <table className="eb-table ps-table co-cmp">
          <caption className="ps-caption">₹ crore and per cent, 2025-26. Select a column heading to sort, or a company to open it. Profit growth is a compound annual rate over the last five years, shown only where both ends are profits.</caption>
          <thead>
            <tr>
              <th scope="col">Company</th>
              {CMP.map((k) => (
                <th key={k.key} scope="col" className="ps-num" aria-sort={sort.key === k.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="ps-sort" onClick={() => setSort({ key: k.key, dir: sort.key === k.key ? -sort.dir : -1 })}>{k.label}{sort.key === k.key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsData.map((r) => (
              <tr key={r.c.id} className={r.c.id === current ? 'co-current' : undefined}>
                <th scope="row"><a href={`#${r.c.id}`} onClick={() => onPick(r.c.id)}>{r.c.short}</a>{r.c.basis === 'Consolidated' && <small className="ps-sector">consolidated</small>}</th>
                {CMP.map((k) => <td key={k.key} className={`ps-num ${r[k.key] < 0 ? 'eb-bad' : ''}`}>{r[k.key] == null ? '·' : k.fmt(r[k.key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CompanyBoard({ source }) {
  const { status, data, error, reload } = useIndicators(source);
  const [skin, setSkin] = useState(readSkin);
  const [id, setId] = useState(() => (typeof window !== 'undefined' ? window.location.hash.slice(1) : ''));
  useEffect(() => { document.title = 'Maharatna company financials | PSU Performance Board'; }, []);
  useEffect(() => {
    const on = () => setId(window.location.hash.slice(1));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const choose = (s) => {
    setSkin(s);
    try { localStorage.setItem('ps-skin', s); } catch { /* this visit only */ }
  };
  const pick = (cid) => {
    setId(cid);
    try { window.history.replaceState(null, '', `#${cid}`); } catch { /* ignore */ }
  };

  if (status === 'loading') {
    return <div className="eb rb ps" data-skin={skin}><main className="rb-main eb-dash"><p className="eb-sr" role="status">Loading…</p><div className="eb-skel-hero" /></main></div>;
  }
  if (status === 'error' || !data) {
    return <div className="eb rb ps" data-skin={skin}><main className="rb-main"><div className="eb-error"><h1>The company figures could not load</h1><p>{error}.</p><button type="button" className="eb-btn" onClick={reload}>Try again</button></div></main></div>;
  }
  const companies = data.companies;
  const c = companies.find((x) => x.id === id) || companies.find((x) => x.id === 'ntpc') || companies[0];
  const tenYears = companies.filter((x) => Object.keys(x.series.revenue || {}).length >= 10).length;

  return (
    <div className="eb rb ps" data-skin={skin}>
      <main className="rb-main eb-dash">
        <Tabs current="companies" />
        <header className="eb-hero">
          <div className="eb-hero-top">
            <div>
              <p className="eb-hero-kicker">NITI Aayog · Economics and Finance II Division</p>
              <h1>Maharatna company financials</h1>
              <p className="eb-hero-asof">{companies.length} of 14 Maharatnas · from each company's own annual reports · {data.as_of}</p>
            </div>
            <div className="eb-range" role="group" aria-label="Colour scheme">
              {SKINS.map((s) => <button key={s.id} type="button" aria-pressed={skin === s.id} onClick={() => choose(s.id)}>{s.label}</button>)}
            </div>
          </div>
          <p className="eb-lead">
            Revenue, profit, margins, net worth, borrowings and dividend for each Maharatna, {tenYears} of them over ten years, taken from the multi-year tables
            in their audited annual reports. Point at any figure to see the report and page it comes from.
          </p>
        </header>

        <nav className="co-picker" aria-label="Choose a company">
          {companies.map((x) => (
            <button key={x.id} type="button" aria-pressed={x.id === c.id} onClick={() => pick(x.id)}>{x.short}</button>
          ))}
          {data.not_covered.map((x) => <button key={x.short} type="button" disabled title={x.reason}>{x.short}</button>)}
        </nav>

        <CompanyView c={c} />
        <Compare companies={companies} onPick={pick} current={c.id} />

        <section className="rb-section" aria-labelledby="co-read-h">
          <div className="eb-eyebar"><h2 className="eb-eyebrow" id="co-read-h">Reading these figures</h2></div>
          <div className="eb-card rb-sources ps-read">
            <ul>
              <li><b>Each company's own accounts.</b> Figures are standalone (the company itself) except Coal India, where the group's consolidated figures are used because the parent mainly holds the mining subsidiaries.</li>
              <li><b>Definitions differ a little.</b> Each company defines revenue and borrowings its own way in these tables (for example SAIL and GAIL report net sales, BPCL sales plus other income, Power Grid only long-term borrowings). The definition is shown under every chart and in the table, so compare trends more than levels across companies.</li>
              <li><b>Per-share figures are left out.</b> Bonus issues and share splits (HAL, Power Grid, IOCL, BPCL and others) make earnings and dividend per share incomparable across years unless restated; totals in ₹ crore are not affected.</li>
              <li><b>Ten years from two reports.</b> Where a company prints only five years, 2016-17 to 2020-21 come from its 2020-21 report. Later reports sometimes restate a year; the board uses the latest report for every year it covers.</li>
              {data.not_covered.length > 0 && (
                <li><b>Not yet included:</b> {data.not_covered.map((x) => x.name).join(' and ')}. Their websites closed every connection while the reports were being collected; they can be added from downloaded copies of their annual reports.</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
