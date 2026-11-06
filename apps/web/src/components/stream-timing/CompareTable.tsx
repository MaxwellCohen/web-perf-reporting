import { compareAnalyses, compareVerdict } from "@/lib/stream-timing/compare";
import type { StreamAnalysis } from "@/lib/stream-timing/types";

const fmt = (n: number, unit: string) =>
  unit === "ms" ? `${Math.round(n)}ms` : unit === "%" ? `${n}%` : String(n);

/** A vs B metrics; negative B - A (green) means B is faster / waits less. */
export function CompareTable({ a, b }: { a: StreamAnalysis; b: StreamAnalysis }) {
  const rows = compareAnalyses(a, b);
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm font-medium">{compareVerdict(a, b)}</p>
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-1 pr-3">Metric</th>
            <th className="pr-3">A</th>
            <th className="pr-3">B</th>
            <th>B − A</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t">
              <td className="py-1.5 pr-3">{r.label}</td>
              <td className="pr-3 tabular-nums">{fmt(r.a, r.unit)}</td>
              <td className="pr-3 tabular-nums">{fmt(r.b, r.unit)}</td>
              <td
                className={`tabular-nums font-medium ${r.delta < 0 ? "text-green-500" : r.delta > 0 ? "text-red-500" : "text-muted-foreground"}`}
              >
                {r.delta > 0 ? "+" : ""}
                {fmt(r.delta, r.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
