import { Routes } from '@angular/router';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { VentraDashboardComponent } from './pages/ventra/dashboard.component';
import { VentraProductosComponent } from './pages/ventra/productos.component';
import { VentraPosComponent } from './pages/ventra/pos.component';
import { VentraVencimientosComponent } from './pages/ventra/vencimientos.component';
import { VentraReportesComponent } from './pages/ventra/reportes.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        component: VentraDashboardComponent,
        pathMatch: 'full',
        title: 'Dashboard | Ventra by FHAN Labs',
      },
      {
        path: 'productos',
        component: VentraProductosComponent,
        title: 'Productos | Ventra by FHAN Labs',
      },
      {
        path: 'pos',
        component: VentraPosComponent,
        title: 'Punto de venta | Ventra by FHAN Labs',
      },
      {
        path: 'vencimientos',
        component: VentraVencimientosComponent,
        title: 'Vencimientos | Ventra by FHAN Labs',
      },
      {
        path: 'reportes',
        component: VentraReportesComponent,
        title: 'Reportes | Ventra by FHAN Labs',
      },
    ],
  },
  {
    path: 'signin',
    component: SignInComponent,
    title: 'Iniciar sesión | Ventra by FHAN Labs',
  },
  {
    path: 'signup',
    component: SignUpComponent,
    title: 'Crear cuenta | Ventra by FHAN Labs',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'No encontrado | Ventra by FHAN Labs',
  },
];
