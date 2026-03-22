
export function renderBoolean(value: boolean) {
  return (
    value ? (
      <span title="true">✅ - Yes</span>
    ) : (
      <span title="false"> ❌ - No</span>
    )
  );
}
