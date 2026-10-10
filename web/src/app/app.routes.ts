import { Routes } from '@angular/router';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { VentraDashboardComponent } from './pages/ventra/dashboard.component';
import { VentraProductosComponent } from './pages/ventra/productos.component';
import { VentraPosComponent } from './pages/ventra/pos.component';
import { VentraVencimientosComponent } from './pages/ventra/vencimientos.component';
import { VentraReportesComponent } from './pages/ventra/reportes.component';
import { VentraUsuariosComponent } from './pages/ventra/usuarios.component';
import { VentraDocumentosComponent } from './pages/ventra/documentos.component';
import { VentraAsistenteComponent } from './pages/ventra/asistente.component';
import { VentraVentasComponent } from './pages/ventra/ventas.component';
import { VentraCajaComponent } from './pages/ventra/caja.component';
import { VentraLoginComponent } from './pages/ventra/login.component';
import { authGuard, adminGuard } from './core/auth.service';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
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
        path: 'ventas',
        component: VentraVentasComponent,
        title: 'Ventas | Ventra by FHAN Labs',
      },
      {
        path: 'caja',
        component: VentraCajaComponent,
        title: 'Caja | Ventra by FHAN Labs',
      },
      {
        path: 'vencimientos',
        component: VentraVencimientosComponent,
        title: 'Vencimientos | Ventra by FHAN Labs',
      },
      {
        path: 'documentos',
        component: VentraDocumentosComponent,
        title: 'Guías y facturas | Ventra by FHAN Labs',
      },
      {
        path: 'asistente',
        component: VentraAsistenteComponent,
        title: 'Asistente IA | Ventra by FHAN Labs',
      },
      {
        path: 'reportes',
        component: VentraReportesComponent,
        canActivate: [adminGuard],
        title: 'Reportes | Ventra by FHAN Labs',
      },
      {
        path: 'usuarios',
        component: VentraUsuariosComponent,
        canActivate: [adminGuard],
        title: 'Usuarios | Ventra by FHAN Labs',
      },
    ],
  },
  {
    path: 'signin',
    component: VentraLoginComponent,
    title: 'Iniciar sesión | Ventra by FHAN Labs',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'No encontrado | Ventra by FHAN Labs',
  },
];
