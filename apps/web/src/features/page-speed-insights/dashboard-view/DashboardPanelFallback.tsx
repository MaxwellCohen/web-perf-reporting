export function DashboardPanelFallback({ label }: { label: string }) {
  return (
    <p className="px-3 py-4 text-sm text-muted-foreground" role="status">
      Loading {label}…
    </p>
  );
}
