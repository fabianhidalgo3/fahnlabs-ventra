import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  colorSchemeDark,
  type Theme,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const base = themeQuartz.withParams({
  accentColor: '#465FFF',
  fontFamily: 'inherit',
  fontSize: 13,
  headerFontWeight: 600,
  wrapperBorderRadius: 16,
  borderRadius: 8,
  rowVerticalPaddingScale: 1.1,
  headerTextColor: '#6B7280',
});

const dark = themeQuartz.withPart(colorSchemeDark).withParams({
  accentColor: '#465FFF',
  fontFamily: 'inherit',
  fontSize: 13,
  headerFontWeight: 600,
  wrapperBorderRadius: 16,
  borderRadius: 8,
  rowVerticalPaddingScale: 1.1,
  backgroundColor: '#161618',
  headerBackgroundColor: '#161618',
  headerTextColor: '#71717A',
  borderColor: '#232326',
});

/** Tema AG Grid Ventra según modo. */
export function ventraGridTheme(isDark: boolean): Theme {
  return isDark ? dark : base;
}

/** Texto de la grilla en español (lo mínimo útil). */
export const GRID_TEXT = {
  noRowsToShow: 'Sin registros',
  page: 'Página',
  of: 'de',
  to: 'a',
  filterOoo: 'Filtrar…',
};
