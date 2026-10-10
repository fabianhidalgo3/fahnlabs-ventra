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

export const VENTRA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 96">
  <path d="M14 32 L48 80 L96 14" fill="none" stroke="${VENTRA_BLUE}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="116" y="75" font-family="Helvetica" font-weight="bold" font-size="60" letter-spacing="1.5" fill="${VENTRA_INK}">ventra</text>
</svg>`;

/** Formatea un monto entero CLP: 1234567 -> "$1.234.567" */
export const clp = (n: number): string =>
  '$' + Math.round(n).toLocaleString('es-CL');
