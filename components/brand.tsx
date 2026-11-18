/**
 * MY GALA brand marks — hand-built vector letterforms (no font dependency), so the
 * monogram renders identically everywhere, including as an app icon / favicon.
 *
 * The MG monogram: a Didone G — hairline top and bottom, heavy left bowl, open
 * aperture with a sharp spur — with a high-contrast M set inside its counter.
 * The G's bowl weaves OVER the M's left stem and UNDER its right stem, so the two
 * letters lock together like a couture house cipher.
 */
import { useId } from "react";

// --- geometry (viewBox 0 0 120 120) -----------------------------------------
// G: outer ellipse (60,60) rx46 ry50, inner ellipse shifted right for Didone stress.
const G_RING = "M60 10 A46 50 0 1 0 60 110 A46 50 0 1 0 60 10 Z M64 15 A33 45 0 1 1 64 105 A33 45 0 1 1 64 15 Z";
// aperture cut (upper right) — removes the ring between ~1 and ~3 o'clock
const G_APERTURE = "M60 60 L130 -8 L130 58 Z";
// crossbar of the G (with an inward serif) — it passes OVER the M's right stem
const G_BAR = "M78 57.6 L111 57.6 L111 61.4 L78 61.4 Z";
// upper terminal (beak serif at the aperture)
const G_BEAK = "M92 20.5 Q99 25 101.8 37 L104.6 37 L104.6 20 Q98 20.4 92 20.5 Z";

// M: Didone — hairline left stem, heavy left diagonal, hairline right diagonal, heavy right stem.
// Set wide so its left stem crosses the G's heavy bowl and its right stem runs under the G's bar.
const M_PARTS = [
  "M22.5 34 L25.3 34 L25.3 88 L22.5 88 Z", // left stem (hairline)
  "M22.5 34 L33.5 34 L56.6 88 L50.4 88 Z", // left diagonal (heavy)
  "M51.6 88 L54.2 88 L80.6 34 L78 34 Z", // right diagonal (hairline)
  "M75 34 L85 34 L85 88 L75 88 Z", // right stem (heavy)
  "M16.5 86.4 L31 86.4 L31 89 L16.5 89 Z", // foot serif left
  "M69.5 86.4 L91 86.4 L91 89 L69.5 89 Z", // foot serif right
  "M16.5 33 L27 33 L27 35.5 L16.5 35.5 Z", // head serif left
  "M75 33 L91 33 L91 35.5 L75 35.5 Z", // head serif right
].join(" ");

function markSvg(ink: string, paper: string, id: string) {
  return `<defs><mask id="ap${id}"><rect width="120" height="120" fill="#fff"/><path d="${G_APERTURE}" fill="#000"/></mask></defs>`
    + `<path d="${G_RING}" fill-rule="evenodd" fill="${ink}" mask="url(#ap${id})"/><path d="${G_BEAK}" fill="${ink}"/>`
    + `<path d="${M_PARTS}" fill="${ink}" stroke="${paper}" stroke-width="2.6" paint-order="stroke"/>`
    + `<path d="${G_BAR}" fill="${ink}" stroke="${paper}" stroke-width="2.4" paint-order="stroke"/>`;
}

export function Monogram({ size = 48, ink = "currentColor", paper = "var(--paper)", title = "MY GALA monogram", className }: { size?: number | string; ink?: string; paper?: string; title?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label={title} dangerouslySetInnerHTML={{ __html: markSvg(ink, paper, id) }} />
  );
}

/** Wordmark: MY GALA in wide-set Didone capitals. */
export function Wordmark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`wordmark ${className ?? ""}`} style={style}>
      MY<span className="wm-gap" />GALA
    </span>
  );
}

/** Lockup: monogram with the wordmark beneath (stacked) or beside (inline). */
export function Lockup({ stacked, size = 40, ink, paper }: { stacked?: boolean; size?: number; ink?: string; paper?: string }) {
  return (
    <span className={stacked ? "lockup stacked" : "lockup"}>
      <Monogram size={size} ink={ink} paper={paper} />
      <Wordmark />
    </span>
  );
}

/** Standalone SVG string for favicons / app icon. */
export function iconSvg(bg = "#0b0b0b", fg = "#f4f2ec") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${bg}"/><g transform="translate(14 14) scale(.7667)">${markSvg(fg, bg, "i")}</g></svg>`;
}
export const ICON_SVG = iconSvg();
