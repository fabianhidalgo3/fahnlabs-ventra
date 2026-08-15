import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonBadge,
  IonButtons, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { ApiService, Summary } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonBadge,
    IonButtons, IonButton, IonIcon,
  ],
})
export class Tab1Page {
  summary?: Summary;
  error = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {
    addIcons({ logOutOutline });
  }

  logout() {
    this.auth.logout();
  }

  ionViewWillEnter() {
    this.load();
  }

  clp(n: number) {
    return '$' + Math.round(n).toLocaleString('es-CL');
  }

  load(event?: CustomEvent) {
    this.api.today().subscribe({
      next: (s) => {
        this.summary = s;
        this.error = '';
        (event?.target as HTMLIonRefresherElement | undefined)?.complete();
      },
      error: () => {
        this.error = 'No se pudo conectar con el servidor';
        (event?.target as HTMLIonRefresherElement | undefined)?.complete();
      },
    });
  }
}
