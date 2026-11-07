/**
 * Shared line icons, drawn in the same style as StatusBadge's icons
 * (24x24 viewBox, stroke="currentColor", strokeWidth 2, round caps/joins) so
 * every icon in the app reads as one consistent set instead of mixing in
 * emoji glyphs, which render inconsistently across platforms/fonts.
 */

export function SproutIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21v-9M12 12c0-4.42 3.58-8 8-8 0 4.42-3.58 8-8 8zM12 12c0-4.42-3.58-8-8-8 0 4.42 3.58 8 8 8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
