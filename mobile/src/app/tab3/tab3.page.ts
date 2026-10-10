import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonBadge,
  IonButton, IonInput, IonSelect, IonSelectOption, IonIcon, IonThumbnail, IonNote,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, documentTextOutline } from 'ionicons/icons';
import { ApiService, PurchaseDoc } from '../core/api.service';

@Component({
  selector: 'app-tab3',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonLabel, IonBadge, IonButton, IonInput, IonSelect, IonSelectOption,
    IonIcon, IonThumbnail, IonNote,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="primary">
        <ion-title>Guías y facturas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="ion-padding">
        <!-- input oculto: capture=environment abre la cámara trasera en el teléfono -->
        <input #fileInput type="file" accept="image/*" capture="environment" hidden
          (change)="onPhoto($any($event.target).files[0])" />

        @if (!photo) {
          <ion-button expand="block" (click)="fileInput.click()">
            <ion-icon name="camera-outline" slot="start"></ion-icon>
            Fotografiar documento
          </ion-button>
        } @else {
          <img [src]="preview" class="preview" alt="foto documento"
            (error)="$any($event.target).src='/assets/product-placeholder.svg'" />
          <ion-select [(ngModel)]="type" label="Tipo" fill="outline" class="ion-margin-bottom">
            <ion-select-option value="GUIA">Guía de despacho</ion-select-option>
            <ion-select-option value="FACTURA">Factura</ion-select-option>
          </ion-select>
          <ion-input [(ngModel)]="supplier" label="Proveedor" labelPlacement="stacked" fill="outline"
            placeholder="Distribuidora…" class="ion-margin-bottom"></ion-input>
          <ion-input [(ngModel)]="folio" label="Folio" labelPlacement="stacked" fill="outline"
            placeholder="N° documento" class="ion-margin-bottom"></ion-input>
          <ion-input [(ngModel)]="amount" label="Monto $" labelPlacement="stacked" fill="outline"
            type="number" inputmode="numeric" class="ion-margin-bottom"></ion-input>

          <ion-button expand="block" (click)="save()" [disabled]="saving">
            {{ saving ? 'Subiendo…' : 'Guardar documento' }}
          </ion-button>
          <ion-button expand="block" fill="outline" color="medium" (click)="reset()">Repetir foto</ion-button>
        }

        @if (error) { <ion-note color="danger">{{ error }}</ion-note> }
      </div>

      <ion-list>
        <ion-item lines="none"><ion-label><strong>Últimos documentos</strong></ion-label></ion-item>
        @for (d of docs; track d.id) {
          <ion-item [href]="api.fileUrl(d.imageUrl)" target="_blank" [detail]="true">
            <ion-thumbnail slot="start">
              <img [src]="api.fileUrl(d.imageUrl)" [alt]="d.folio ?? d.type"
                (error)="$any($event.target).src='/assets/product-placeholder.svg'" />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ d.supplier ?? 'Sin proveedor' }} {{ d.folio ? '· #' + d.folio : '' }}</h2>
              <p>{{ (d.docDate ?? d.createdAt) | date: 'dd/MM/yyyy' }}
                @if (d.amount) { · {{ clp(d.amount) }} }
              </p>
            </ion-label>
            <ion-badge slot="end" [color]="d.type === 'GUIA' ? 'tertiary' : 'primary'">
              {{ d.type === 'GUIA' ? 'Guía' : 'Factura' }}
            </ion-badge>
          </ion-item>
        } @empty {
          <ion-item lines="none"><ion-label class="ion-text-center" color="medium">Aún no hay documentos</ion-label></ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      .preview {
        width: 100%;
        max-height: 240px;
        object-fit: cover;
        object-position: top;
        border-radius: 12px;
        margin-bottom: 12px;
      }
    `,
  ],
})
export class Tab3Page implements OnInit {
  docs: PurchaseDoc[] = [];
  photo?: File;
  preview = '';
  type: 'GUIA' | 'FACTURA' = 'GUIA';
  supplier = '';
  folio = '';
  amount?: number;
  saving = false;
  error = '';

  constructor(
    public api: ApiService,
    private toasts: ToastController,
  ) {
    addIcons({ cameraOutline, documentTextOutline });
  }

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  clp(n: number) {
    return '$' + Math.round(Number(n)).toLocaleString('es-CL');
  }

  load() {
    this.api.docs().subscribe((d) => (this.docs = d.slice(0, 20)));
  }

  onPhoto(file?: File) {
    if (!file) return;
    this.photo = file;
    this.preview = URL.createObjectURL(file);
  }

  reset() {
    this.photo = undefined;
    this.preview = '';
    this.error = '';
  }

  async save() {
    if (!this.photo) return;
    this.saving = true;
    this.error = '';
    const fd = new FormData();
    fd.append('file', this.photo);
    fd.append('type', this.type);
    if (this.supplier) fd.append('supplier', this.supplier);
    if (this.folio) fd.append('folio', this.folio);
    if (this.amount) fd.append('amount', String(this.amount));
    this.api.createDoc(fd).subscribe({
      next: async () => {
        this.saving = false;
        this.reset();
        this.supplier = this.folio = '';
        this.amount = undefined;
        this.load();
        const t = await this.toasts.create({
          message: '✓ Documento guardado',
          duration: 1500,
          position: 'top',
          color: 'success',
        });
        t.present();
      },
      error: (e) => {
        this.saving = false;
        this.error = e?.error?.message ?? 'Error al subir';
      },
    });
  }
}
