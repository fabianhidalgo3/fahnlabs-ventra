import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { VentraTopNavComponent } from '../top-nav/top-nav.component';
import { VentraSidebarComponent } from '../sidebar/ventra-sidebar.component';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterModule, AppHeaderComponent, VentraTopNavComponent, VentraSidebarComponent],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {}
