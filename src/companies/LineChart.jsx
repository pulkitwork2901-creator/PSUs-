import { useState } from 'react';
import useWidth from '../shared/useWidth.js';
import { niceScale } from '../shared/format.js';

// Yearly lines for ratios (margins, returns, debt to equity). Each series is
// {key, label, color, values: {year: number|null}}; a missing year breaks the
// line rather than being drawn as zero.
export default function LineChart({ years, series, fmt, height = 210, label }) {
  const [ref, W] = useWidth(520, 240);
  const [hover, setHover] = useState(null);
  const M = { top: 14, right: 14, bottom: 26, left: 46 };
  const plotW = W - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const all = series.flatMap((s) => years.map((y) => s.values[y])).filter((v) => v != null && Number.isFinite(v));
  if (all.length < 2) return <div ref={ref}><p className="eb-empty">Not enough years to draw a trend.</p></div>;
  const [vMin, vMax, step] = niceScale(Math.min(0, ...all), Math.max(...all), 4);
  const x = (i) => M.left + (years.length === 1 ? plotW / 2 : (i / (years.length - 1)) * plotW);
  const y = (v) => M.top + plotH * (1 - (v - vMin) / (vMax - vMin));
  const ticks = [];
  for (let v = vMin; v <= vMax + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  const every = Math.max(1, Math.ceil((years.length * 50) / plotW));
  const paths = series.map((s) => {
    let d = '';
    let pen = false;
    years.forEach((yr, i) => {
      const v = s.values[yr];
      if (v == null || !Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  });
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    years.forEach((_, i) => { if (Math.abs(x(i) - mx) < Math.abs(x(best) - mx)) best = i; });
    setHover(best);
  };
  const hy = hover != null ? years[hover] : null;

  return (
    <div ref={ref} className="eb-mc-plot">
      <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" onPointerMove={onMove} onPointerLeave={() => setHover(null)}
        aria-label={`${label}. ${series.map((s) => `${s.label}: ${years.map((yr) => `${yr} ${fmt(s.values[yr])}`).join(', ')}`).join('. ')}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + plotW} y1={y(v)} y2={y(v)} className={v === 0 ? 'eb-axis' : 'eb-grid'} />
            <text x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="eb-tick">{fmt(v, true)}</text>
          </g>
        ))}
        {years.map((yr, i) => ((years.length - 1 - i) % every === 0
          ? <text key={yr} x={x(i)} y={height - 7} textAnchor="middle" className="eb-tick">{yr.replace(/^20(\d\d)-(\d\d)$/, '$1-$2')}</text> : null))}
        {series.map((s, si) => <path key={s.key} d={paths[si]} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" className="eb-draw" pathLength="1" />)}
        {series.map((s) => years.map((yr, i) => (s.values[yr] != null && Number.isFinite(s.values[yr])
          ? <circle key={s.key + yr} cx={x(i)} cy={y(s.values[yr])} r={hover === i ? 4.5 : 2.5} fill={s.color} className="eb-mc-ring" /> : null)))}
        {hy && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + plotH} className="eb-mc-cross" />}
      </svg>
      {hy && (
        <div className="eb-tip eb-mc-tip" style={{ left: Math.min(Math.max(x(hover) - 90, 0), Math.max(0, W - 200)), top: 0 }}>
          <span>{hy}</span>
          {series.map((s) => (
            <div key={s.key} className="eb-mc-tiprow"><i style={{ background: s.color }} aria-hidden="true" />{s.label}: <b>{fmt(s.values[hy])}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}
