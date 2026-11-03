"use client";

import { useMemo, useState } from "react";
import { buildFixPrompt } from "./fixPrompt";
import { analyzeLoad, fnLabel, shortUrl, type KeyEvent, type Tone } from "./analyzeLoad";
import type { ParsedTrace } from "./parseTrace";

const TONE: Record<Tone, string> = {
  good: "bg-green-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
  info: "bg-sky-500",
};
const KIND_LABEL: Record<KeyEvent["kind"], string> = {
  navigation: "NAV",
  network: "NET",
  parse: "HTML",
  script: "JS",
  paint: "PAINT",
  lcp: "LCP",
  shift: "CLS",
  task: "TASK",
  load: "LOAD",
};
const CAT_COLOR: Record<string, string> = {
  script: "bg-[#e6a700]",
  layout: "bg-[#8e5bd6]",
  paint: "bg-[#2f9e5e]",
  gc: "bg-[#e8743b]",
  network: "bg-[#2f7fd6]",
  other: "bg-[#8a94a3]",
};

const ms = (v?: number) => (v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);

function Stat({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-lg font-semibold tabular-nums">
        {tone && <i className={`inline-block size-2.5 rounded-full ${TONE[tone]}`} />}
        {value}
      </div>
    </div>
  );
}

function FixPrompt({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Fix prompt — paste into your coding agent</span>
        <button
          className="rounded border px-2 py-0.5"
          onClick={() => void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea readOnly rows={10} value={text} className="w-full rounded border bg-transparent p-2 font-mono text-xs" />
    </div>
  );
}

export function KeyEventsPanel({ trace }: { trace: ParsedTrace }) {
  const a = useMemo(() => analyzeLoad(trace), [trace]);
  const fixPrompt = useMemo(() => buildFixPrompt(a), [a]);
  const total = a.phases.at(-1)?.end ?? 1;
  const rating = (v: number | undefined, g: number, b: number): Tone | undefined =>
    v == null ? undefined : v <= g ? "good" : v <= b ? "warn" : "bad";

  return (
    <section className="mb-6 space-y-4" aria-label="What happened during page load">
      <div>
        <h2 className="text-lg font-bold">What happened during load</h2>
        {a.navUrl && <p className="truncate text-xs text-muted-foreground">{a.navUrl} · times are ms since navigation start</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="TTFB" value={ms(a.ttfb)} tone={rating(a.ttfb, 800, 1800)} />
        <Stat label="FCP" value={ms(a.fcp)} tone={rating(a.fcp, 1800, 3000)} />
        <Stat label="LCP" value={ms(a.lcp)} tone={rating(a.lcp, 2500, 4000)} />
        <Stat label="CLS" value={a.cls.toFixed(3)} tone={rating(a.cls, 0.1, 0.25)} />
        <Stat label="Blocking time after FCP" value={ms(a.blockingMs)} tone={rating(a.blockingMs, 200, 600)} />
      </div>

      {a.phases.length > 0 && (
        <div>
          <div className="flex h-9 w-full overflow-hidden rounded-md border text-[11px]">
            {a.phases.map((p, i) => (
              <div
                key={p.label}
                className="flex flex-col justify-center overflow-hidden border-r px-2 last:border-r-0"
                style={{ width: `${((p.end - p.start) / total) * 100}%`, background: `hsl(${210 + i * 25} 40% 30% / 0.35)` }}
                title={`${p.label}: ${ms(p.start)} → ${ms(p.end)}`}
              >
                <span className="truncate font-medium">{p.label}</span>
                <span className="truncate text-muted-foreground">{ms(p.end - p.start)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {a.phases.map((p) => {
              const sum = Object.values(p.byCategory).reduce((x, y) => x + (y ?? 0), 0) || 1;
              return (
                <div key={p.label} className="text-xs">
                  <div className="mb-1 flex justify-between text-muted-foreground">
                    <span className="truncate">{p.label}</span>
                    <span>main thread {ms(sum)} busy</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded bg-muted">
                    {Object.entries(p.byCategory).map(([c, v]) => (
                      <i key={c} className={CAT_COLOR[c]} style={{ width: `${((v ?? 0) / (p.end - p.start)) * 100}%` }} title={`${c}: ${ms(v)}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ol className="relative max-h-[28rem] overflow-auto rounded-md border p-3" aria-label="Key events">
          {a.events.map((e, i) => (
            <li key={i} className="flex gap-3 py-1.5 text-sm">
              <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">{ms(e.time)}</span>
              <i className={`mt-1.5 size-2.5 shrink-0 rounded-full ${TONE[e.tone]}`} />
              <span className="min-w-0">
                <span className="mr-2 rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">{KIND_LABEL[e.kind]}</span>
                {e.title}
                {e.detail && <span className="block truncate text-xs text-muted-foreground">{e.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
        <div className="rounded-md border p-3 text-sm">
          <div className="mb-2 font-medium">Top scripts (main-thread time)</div>
          <table className="w-full table-fixed text-xs">
            <tbody>
              {a.scripts.map((s) => (
                <tr key={s.url} className="border-t">
                  <td className="truncate py-1 pr-2" title={s.url}>{shortUrl(s.url, 60)}</td>
                  <td className="w-16 py-1 text-right font-mono tabular-nums">{ms(s.ms)}</td>
                </tr>
              ))}
              {a.scripts.length === 0 && <tr><td className="text-muted-foreground">No attributed scripts</td></tr>}
            </tbody>
          </table>
          {a.hotFunctions.length > 0 && (
            <>
              <div className="mb-2 mt-4 font-medium">Hottest functions (CPU samples)</div>
              <table className="w-full table-fixed text-xs">
                <tbody>
                  {a.hotFunctions.map((h) => (
                    <tr key={`${h.fn}${h.url}${h.line}`} className="border-t">
                      <td className="truncate py-1 pr-2" title={`${h.fn} ${h.url}:${h.line + 1}`}>{fnLabel(h)}</td>
                      <td className="w-16 py-1 text-right font-mono tabular-nums">{ms(h.ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
      <FixPrompt text={fixPrompt} />
    </section>
  );
}
