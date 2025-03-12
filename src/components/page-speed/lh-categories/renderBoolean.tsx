
export function renderBoolean(value: boolean) {
  return (
    value ? (
      <span title="true">✅</span>
    ) : (
      <span title="false"> ❌</span>
    )
  );
}
