"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { categorize, LONG_TASK_MS, type Category, type ParsedTrace, type Slice } from "./parseTrace";

const COLORS: Record<Category, string> = {
  script: "#e6a700",
  layout: "#8e5bd6",
  paint: "#2f9e5e",
  gc: "#e8743b",
  network: "#2f7fd6",
  other: "#8a94a3",
};
const ROW_H = 16;
const LABEL_W = 110;
const SHOT_H = 64;
const OVERVIEW_H = 48;
const RULER_H = 20;

type View = { start: number; end: number };

function fmt(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(ms < 10 ? 2 : 0)} ms`;
}

export function TraceTimeline({ trace }: { trace: ParsedTrace }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgCache = useRef(new Map<number, HTMLImageElement>());
  const [width, setWidth] = useState(1000);
  const [view, setView] = useState<View>({ start: 0, end: trace.duration });
  const [hover, setHover] = useState<{ slice: Slice; x: number; y: number; track: string } | null>(null);
  const [selected, setSelected] = useState<{ slice: Slice; track: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => setView({ start: 0, end: trace.duration }), [trace]);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Layout: y offsets for each track.
  const layout = useMemo(() => {
    let y = RULER_H + SHOT_H + OVERVIEW_H + 8;
    const rows = trace.tracks.map((t) => {
      const h = collapsed[t.id] ? ROW_H : (t.maxDepth + 1) * ROW_H;
      const r = { track: t, y, h };
      y += h + 6;
      return r;
    });
    return { rows, height: y };
  }, [trace, collapsed]);

  const chartW = Math.max(100, width - LABEL_W);
  const xOf = useCallback((t: number) => LABEL_W + ((t - view.start) / (view.end - view.start)) * chartW, [view, chartW]);
  const tOf = useCallback((x: number) => view.start + ((x - LABEL_W) / chartW) * (view.end - view.start), [view, chartW]);

  // Running max of slice end times per track (slices are start-sorted), so the
  // first possibly-visible slice can be binary searched instead of scanning all.
  const prefixEnds = useMemo(() => {
    const m = new Map<string, Float64Array>();
    for (const t of trace.tracks) {
      const a = new Float64Array(t.slices.length);
      let mx = -Infinity;
      for (let i = 0; i < a.length; i++) {
        mx = Math.max(mx, t.slices[i].start + t.slices[i].dur);
        a[i] = mx;
      }
      m.set(t.id, a);
    }
    return m;
  }, [trace]);
  const firstVisible = (trackId: string, t: number) => {
    const a = prefixEnds.get(trackId)!;
    let lo = 0, hi = a.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < t) lo = m + 1; else hi = m; }
    return lo;
  };

  // Overview histogram (main thread busy fraction per bucket).
  const overview = useMemo(() => {
    const main = trace.tracks[0];
    const buckets = 400;
    const out = new Float32Array(buckets);
    if (!main) return out;
    const bw = trace.duration / buckets;
    for (const s of main.slices) {
      if (s.depth !== 0) continue;
      for (let b = Math.floor(s.start / bw); b <= Math.min(buckets - 1, Math.floor((s.start + s.dur) / bw)); b++) {
        const lo = Math.max(s.start, b * bw);
        const hi = Math.min(s.start + s.dur, (b + 1) * bw);
        out[b] += Math.max(0, hi - lo) / bw;
      }
    }
    return out;
  }, [trace]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const H = layout.height;
    canvas.width = width * dpr;
    canvas.height = H * dpr;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const rgb = (getComputedStyle(canvas).color.match(/\d+/g) ?? ["0", "0", "0"]).map(Number);
    const dark = (rgb[0] + rgb[1] + rgb[2]) / 3 > 128;
    const fg = dark ? "#e5e7eb" : "#1f2937";
    const muted = dark ? "#6b7280" : "#9ca3af";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    // Ruler
    const span = view.end - view.start;
    let step = 1;
    for (let m = 0.1; ; m *= 10) {
      const k = [1, 2, 5].find((k) => ((k * m) / span) * chartW > 80);
      if (k) { step = k * m; break; }
    }
    ctx.fillStyle = muted;
    ctx.strokeStyle = dark ? "#262a33" : "#e5e7eb";
    for (let t = Math.ceil(view.start / step) * step; t < view.end; t += step) {
      const x = xOf(t);
      ctx.beginPath(); ctx.moveTo(x, RULER_H - 4); ctx.lineTo(x, H); ctx.stroke();
      ctx.fillText(fmt(t), x + 3, RULER_H / 2);
    }

    // Screenshots strip
    const shotY = RULER_H;
    const shotW = SHOT_H * 0.8;
    const nShots = Math.max(1, Math.floor(chartW / (shotW + 2)));
    let last = -1;
    for (let i = 0; i < nShots; i++) {
      const t = view.start + ((i + 0.5) / nShots) * span;
      let lo = 0, hi = trace.screenshots.length - 1, idx = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (trace.screenshots[m].time <= t) { idx = m; lo = m + 1; } else hi = m - 1; }
      if (idx < 0 || idx === last) { if (idx >= 0) {} else continue; }
      const s = trace.screenshots[idx];
      let img = imgCache.current.get(idx);
      if (!img) {
        img = new Image();
        img.onload = () => draw();
        img.src = `data:image/jpeg;base64,${s.data}`;
        imgCache.current.set(idx, img);
      }
      const x = LABEL_W + (i / nShots) * chartW;
      if (img.complete && img.naturalWidth) ctx.drawImage(img, x, shotY, shotW, SHOT_H - 2);
      last = idx;
    }

    // Overview
    const ovY = RULER_H + SHOT_H + 2;
    ctx.fillStyle = dark ? "#1b1f27" : "#f3f4f6";
    ctx.fillRect(LABEL_W, ovY, chartW, OVERVIEW_H - 4);
    ctx.fillStyle = "#6b7fd6";
    const bw = chartW / overview.length;
    for (let i = 0; i < overview.length; i++) {
      const h = Math.min(1, overview[i]) * (OVERVIEW_H - 6);
      ctx.fillRect(LABEL_W + i * bw, ovY + OVERVIEW_H - 4 - h, Math.ceil(bw), h);
    }
    ctx.fillStyle = "rgba(231,56,56,0.9)";
    for (const lt of trace.longTasks) ctx.fillRect(LABEL_W + (lt.start / trace.duration) * chartW, ovY, Math.max(1, (lt.dur / trace.duration) * chartW), 3);
    const vx0 = LABEL_W + (view.start / trace.duration) * chartW;
    const vx1 = LABEL_W + (view.end / trace.duration) * chartW;
    ctx.fillStyle = "rgba(100,140,255,0.12)";
    ctx.fillRect(vx0, ovY, vx1 - vx0, OVERVIEW_H - 4);
    ctx.strokeStyle = "#4f6bff";
    ctx.strokeRect(vx0 + 0.5, ovY + 0.5, Math.max(2, vx1 - vx0), OVERVIEW_H - 5);

    // Tracks
    for (const { track, y, h } of layout.rows) {
      ctx.fillStyle = fg;
      ctx.fillText(`${collapsed[track.id] ? "▸" : "▾"} ${track.label}`, 6, y + ROW_H / 2);
      ctx.save();
      ctx.beginPath(); ctx.rect(LABEL_W, y, chartW, h); ctx.clip();
      for (let i = firstVisible(track.id, view.start); i < track.slices.length; i++) {
        const s = track.slices[i];
        if (s.start > view.end) break;
        if (s.start + s.dur < view.start) continue;
        const x = xOf(s.start);
        const w = (s.dur / span) * chartW;
        if (w < 0.5) continue;
        const d = collapsed[track.id] ? 0 : s.depth;
        if (collapsed[track.id] && s.depth > 0) continue;
        ctx.fillStyle = COLORS[categorize(s.name)];
        ctx.fillRect(x, y + d * ROW_H, Math.max(1, w - 0.5), ROW_H - 1);
        if (w > 40) {
          ctx.fillStyle = "#111";
          ctx.fillText(s.name, x + 3, y + d * ROW_H + ROW_H / 2, w - 6);
        }
      }
      if (track === trace.tracks[0]) {
        ctx.fillStyle = "#e73838";
        for (const lt of trace.longTasks) ctx.fillRect(xOf(lt.start), y - 3, Math.max(1, (lt.dur / span) * chartW), 3);
      }
      ctx.restore();
      if (selected?.track === track.id) {
        const s = selected.slice;
        ctx.strokeStyle = "#4f6bff"; ctx.lineWidth = 2;
        ctx.strokeRect(xOf(s.start), y + (collapsed[track.id] ? 0 : s.depth) * ROW_H, Math.max(2, (s.dur / span) * chartW), ROW_H - 1);
        ctx.lineWidth = 1;
      }
    }

    // Markers
    trace.markers.forEach((m, i) => {
      if (m.time < view.start || m.time > view.end) return;
      const x = xOf(m.time);
      ctx.strokeStyle = "#e73838"; ctx.beginPath(); ctx.moveTo(x, RULER_H); ctx.lineTo(x, H); ctx.stroke();
      ctx.fillStyle = "#e73838";
      const label = `${m.label} ${fmt(m.time)}`;
      ctx.fillRect(x, RULER_H + SHOT_H - 14 - (i % 2) * 0, ctx.measureText(label).width + 6, 13);
      ctx.fillStyle = "#fff"; ctx.fillText(label, x + 3, RULER_H + SHOT_H - 7);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [width, layout, view, trace, chartW, xOf, overview, selected, collapsed]);

  useEffect(() => { draw(); }, [draw]);

  const hitTest = (x: number, y: number) => {
    for (const { track, y: ty, h } of layout.rows) {
      if (y < ty || y > ty + h || x < LABEL_W) continue;
      const depth = collapsed[track.id] ? 0 : Math.floor((y - ty) / ROW_H);
      const t = tOf(x);
      for (let i = firstVisible(track.id, t); i < track.slices.length; i++) {
        const s = track.slices[i];
        if (s.start > t) break;
        if (s.depth === depth && t <= s.start + s.dur) return { slice: s, track: track.id, label: track.label };
      }
    }
    return null;
  };

  const zoom = (factor: number, anchorT: number) => {
    setView((v) => {
      const span = Math.min(trace.duration, Math.max(0.5, (v.end - v.start) * factor));
      let start = anchorT - ((anchorT - v.start) / (v.end - v.start)) * span;
      start = Math.max(0, Math.min(trace.duration - span, start));
      return { start, end: start + span };
    });
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        zoom(Math.exp(e.deltaY * 0.0015), tOf(e.clientX - rect.left));
      } else {
        setView((v) => {
          const dt = (e.deltaX / chartW) * (v.end - v.start);
          const start = Math.max(0, Math.min(trace.duration - (v.end - v.start), v.start + dt));
          return { start, end: start + (v.end - v.start) };
        });
      }
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  });

  const drag = useRef<{ x: number; start: number; end: number; mode: "pan" | "overview" } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const ovY = RULER_H + SHOT_H;
    if (y >= ovY && y <= ovY + OVERVIEW_H) {
      const t = ((x - LABEL_W) / chartW) * trace.duration;
      const span = view.end - view.start;
      const start = Math.max(0, Math.min(trace.duration - span, t - span / 2));
      setView({ start, end: start + span });
      drag.current = { x: e.clientX, start, end: start + span, mode: "overview" };
    } else {
      const row = layout.rows.find((r) => y >= r.y && y <= r.y + ROW_H && x < LABEL_W);
      if (row) { setCollapsed((c) => ({ ...c, [row.track.id]: !c[row.track.id] })); return; }
      drag.current = { x: e.clientX, start: view.start, end: view.end, mode: "pan" };
    }
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const d = drag.current;
    if (d) {
      const span = d.end - d.start;
      const dt = d.mode === "pan"
        ? -((e.clientX - d.x) / chartW) * span
        : ((e.clientX - d.x) / chartW) * trace.duration;
      const start = Math.max(0, Math.min(trace.duration - span, d.start + dt));
      setView({ start, end: start + span });
      return;
    }
    const hit = hitTest(x, y);
    setHover(hit ? { slice: hit.slice, x, y, track: hit.label } : null);
  };
  const onUp = () => {
    drag.current = null;
  };
  const onClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) setSelected({ slice: hit.slice, track: hit.track });
  };

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(Object.keys(COLORS) as Category[]).map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <i className="inline-block size-2.5 rounded-sm" style={{ background: COLORS[c] }} />
            {c}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-1 w-3 bg-red-500" />long task ≥ {LONG_TASK_MS} ms ({trace.longTasks.length})
        </span>
        <span className="ml-auto flex gap-2">
          <button className="rounded border px-2 py-0.5" onClick={() => zoom(0.5, (view.start + view.end) / 2)}>+</button>
          <button className="rounded border px-2 py-0.5" onClick={() => zoom(2, (view.start + view.end) / 2)}>−</button>
          <button className="rounded border px-2 py-0.5" onClick={() => setView({ start: 0, end: trace.duration })}>Reset</button>
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => setHover(null)}
        onClick={onClick}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded border bg-background px-2 py-1 text-xs shadow"
          style={{ left: Math.min(hover.x + 12, width - 220), top: hover.y + 40 }}
        >
          <div className="font-medium">{hover.slice.name}</div>
          <div className="text-muted-foreground">
            {hover.track} · {fmt(hover.slice.dur)} @ {fmt(hover.slice.start)}
          </div>
        </div>
      )}
      {selected && (
        <div className="mt-3 rounded border p-3 text-xs">
          <div className="mb-1 font-medium">{selected.slice.name} — {fmt(selected.slice.dur)}</div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(selected.slice.args ?? {}, null, 2).slice(0, 4000)}</pre>
        </div>
      )}
    </div>
  );
}
