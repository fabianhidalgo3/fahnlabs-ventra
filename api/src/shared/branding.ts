/**
 * Identidad visual Ventra (FHAN Labs) para documentos PDF (pdfmake).
 * Logo horizontal minimalista: isotipo "V"/check ascendente azul + wordmark.
 * El wordmark usa <text> con font-family="Helvetica", que pdfmake resuelve
 * contra sus fuentes estándar PDF (no requiere archivos externos).
 */

export const VENTRA_BLUE = '#465FFF';
export const VENTRA_INK = '#111827';
export const VENTRA_GRAY = '#6B7280';
export const VENTRA_GRAY_LIGHT = '#E5E7EB';
export const VENTRA_BG_SOFT = '#F9FAFB';
export const VENTRA_BG_KPI = '#F3F4F6';

export const VENTRA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 110">
  <rect x="8" y="19" width="72" height="72" rx="18" fill="#465FFF"/>
  <path d="M26 48 L41 70 L64 36" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="64" cy="36" r="4.5" fill="#FFFFFF"/>
  <text x="96" y="66" font-family="Helvetica" font-size="46" font-weight="bold" fill="#111827">ventra</text>
  <text x="98" y="88" font-family="Helvetica" font-size="14" letter-spacing="2" fill="#6B7280">BY FHAN LABS</text>
</svg>`;

/** Formatea un monto entero CLP: 1234567 -> "$1.234.567" */
export const clp = (n: number): string =>
  '$' + Math.round(n).toLocaleString('es-CL');
