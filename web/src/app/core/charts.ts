import type { ApexOptions } from 'ng-apexcharts';

export const CHART_PALETTE = ['#465FFF', '#12B76A', '#F79009', '#F04438', '#7A5AF8', '#0BA5EC'];

/** Base común de ApexCharts con soporte claro/oscuro y estilo Ventra. */
export function apexBase(isDark: boolean): Partial<ApexOptions> {
  return {
    // Sin `type`: cada gráfico define el suyo al hacer spread de esta base.
    chart: {
      toolbar: { show: false },
      fontFamily: 'inherit',
      foreColor: isDark ? '#A1A1AA' : '#71717A',
      background: 'transparent',
    } as ApexOptions['chart'],
    colors: CHART_PALETTE,
    grid: {
      borderColor: isDark ? '#232326' : '#F2F4F7',
      strokeDashArray: 4,
    },
    dataLabels: { enabled: false },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    legend: {
      position: 'bottom',
      fontSize: '13px',
      // `size` existe en runtime (ApexCharts >= 4) aunque el typing de ng-apexcharts no lo declare.
      markers: { size: 5 } as NonNullable<ApexOptions['legend']>['markers'],
      itemMargin: { horizontal: 10 },
    },
  };
}

export const clpFormatter = (v: number) => '$' + Math.round(v).toLocaleString('es-CL');
