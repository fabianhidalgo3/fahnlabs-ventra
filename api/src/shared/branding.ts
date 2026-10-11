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

export const VENTRA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 96">
  <rect x="4" y="10" width="76" height="76" rx="19" fill="#465FFF"/>
  <rect x="22" y="56" width="11" height="18" rx="5.5" fill="#FFFFFF" opacity="0.75"/>
  <rect x="37" y="42" width="11" height="32" rx="5.5" fill="#FFFFFF" opacity="0.9"/>
  <rect x="52" y="26" width="11" height="48" rx="5.5" fill="#FFFFFF"/>
  <text x="96" y="62" font-family="Helvetica" font-size="52" font-weight="bold" fill="#111827">ventra</text>
  <text x="99" y="86" font-family="Helvetica" font-size="14" letter-spacing="2.5" fill="#6B7280">BY FHAN LABS</text>
</svg>`;

/** Formatea un monto entero CLP: 1234567 -> "$1.234.567" */
export const clp = (n: number): string =>
  '$' + Math.round(n).toLocaleString('es-CL');
