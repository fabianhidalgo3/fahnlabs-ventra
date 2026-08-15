import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonInput, IonButton, IonCard, IonCardContent, IonNote,
} from '@ionic/angular/standalone';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonButton, IonCard, IonCardContent, IonNote],
  template: `
    <ion-content class="ion-padding">
      <div class="login-wrap">
        <h1 class="logo">Ventra<span>.</span></h1>
        <p class="subtitle">by FHAN Labs</p>

        <ion-card>
          <ion-card-content>
            <ion-input [(ngModel)]="email" type="email" label="Email" labelPlacement="stacked"
              placeholder="admin@fhanlabs.cl" fill="outline" class="ion-margin-bottom"></ion-input>
            <ion-input [(ngModel)]="password" type="password" label="Contraseña" labelPlacement="stacked"
              placeholder="••••••••" fill="outline" (keydown.enter)="submit()"></ion-input>

            @if (error) { <ion-note color="danger">{{ error }}</ion-note> }

            <ion-button expand="block" class="ion-margin-top" (click)="submit()" [disabled]="loading">
              {{ loading ? 'Ingresando…' : 'Ingresar' }}
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .login-wrap {
        max-width: 420px;
        margin: 18vh auto 0;
        text-align: center;
      }
      .logo {
        font-size: 2.4rem;
        font-weight: 800;
        margin: 0;
      }
      .logo span {
        color: var(--ion-color-primary);
      }
      .subtitle {
        color: var(--ion-color-medium);
        margin-top: 4px;
        margin-bottom: 20px;
      }
      ion-card {
        text-align: left;
      }
    `,
  ],
})
export class LoginPage {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  submit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/tabs/tab1']),
      error: (e) => {
        this.error = e?.error?.message ?? 'No se pudo iniciar sesión';
        this.loading = false;
      },
    });
  }
}
