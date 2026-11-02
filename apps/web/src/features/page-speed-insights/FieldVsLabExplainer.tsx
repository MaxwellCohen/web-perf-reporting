export function FieldVsLabExplainer() {
  return (
    <details className="col-span-full mb-2 rounded-md border px-4 py-2 text-sm print:hidden">
      <summary className="cursor-pointer font-medium">
        Why do field data and lab results differ?
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-xs leading-snug text-muted-foreground">
        <p>
          <strong>Field data</strong> (Chrome UX Report) is collected from real Chrome users over
          the previous 28 days and reported at the 75th percentile. It reflects varied devices,
          networks, and locations, and includes interactions such as INP.
        </p>
        <p>
          <strong>Lab data</strong> (Lighthouse) is a single synthetic run on a fixed device and
          throttled network. It is repeatable and good for debugging, but it cannot capture real
          user diversity, caching, or logged-in states.
        </p>
        <p>
          Expect the numbers to differ. Use field data to judge real-world experience and lab data
          to find and verify fixes.
        </p>
      </div>
    </details>
  );
}
