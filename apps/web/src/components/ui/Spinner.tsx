export function Spinner({ size = 20, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      style={{
        width: size,
        height: size,
        display: "inline-block",
        borderRadius: "50%",
        border: `2px solid ${inverted ? "rgba(255,255,255,0.4)" : "var(--sp-border-subtle)"}`,
        borderTopColor: inverted ? "#fff" : "var(--sp-accent)",
        animation: "sp-spin 700ms linear infinite",
      }}
    >
      <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
