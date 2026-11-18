/**
 * MY GALA brand marks.
 * Monogram: a clean geometric M set high-left and a G set low-right, on a diagonal.
 * Wordmark: MY GALA in widely tracked geometric capitals.
 */
const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

export function Monogram({ size = 44, ink = "currentColor", className, title = "MY GALA" }: { size?: number | string; ink?: string; paper?: string; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={title}>
      <text x="6" y="50" fontFamily={FONT} fontWeight={500} fontSize="52" fill={ink} letterSpacing="-1">M</text>
      <text x="46" y="94" fontFamily={FONT} fontWeight={500} fontSize="52" fill={ink}>G</text>
    </svg>
  );
}

export function Wordmark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`wordmark ${className ?? ""}`} style={style}>MY GALA</span>;
}

export function Lockup({ size = 40 }: { stacked?: boolean; size?: number; ink?: string; paper?: string }) {
  return <span className="lockup"><Monogram size={size} /><Wordmark /></span>;
}

export function iconSvg(bg = "#ffffff", fg = "#111111") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="10" y="52" font-family="Montserrat, Helvetica, Arial, sans-serif" font-weight="500" font-size="46" fill="${fg}">M</text><text x="46" y="90" font-family="Montserrat, Helvetica, Arial, sans-serif" font-weight="500" font-size="46" fill="${fg}">G</text></svg>`;
}
export const ICON_SVG = iconSvg();
