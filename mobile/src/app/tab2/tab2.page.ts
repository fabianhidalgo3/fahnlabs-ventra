import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonBadge,
  IonButton, IonInput, IonNote, IonIcon, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barcodeOutline, addCircleOutline, checkmarkDoneOutline, cameraOutline, stopCircleOutline } from 'ionicons/icons';
import { ApiService, InventoryCount } from '../core/api.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
    IonItem, IonLabel, IonBadge, IonButton, IonInput, IonNote, IonIcon,
  ],
})
export class Tab2Page {
  counts: InventoryCount[] = [];
  active?: InventoryCount;
  code = '';
  lastScanned = '';
  scanning = false;
  private stream?: MediaStream;
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  constructor(
    private api: ApiService,
    private alerts: AlertController,
    private toasts: ToastController,
  ) {
    addIcons({ barcodeOutline, addCircleOutline, checkmarkDoneOutline, cameraOutline, stopCircleOutline });
  }

  ionViewWillEnter() {
    this.loadCounts();
  }

  ionViewWillLeave() {
    this.stopCamera();
  }

  loadCounts() {
    this.api.counts().subscribe((c) => (this.counts = c));
  }

  newCount() {
    this.api.openCount('Conteo desde app móvil').subscribe((c) => this.open(c.id));
  }

  open(id: string) {
    this.api.getCount(id).subscribe((c) => (this.active = c));
  }

  async scan() {
    const code = this.code.trim();
    if (!code || !this.active) return;
    this.api.scan(this.active.id, code).subscribe({
      next: async (item) => {
        this.lastScanned = `${item.product.name} → ${item.counted}`;
        this.code = '';
        this.open(this.active!.id);
        const t = await this.toasts.create({
          message: `✓ ${item.product.name}: ${item.counted} contados`,
          duration: 1200,
          position: 'top',
          color: 'success',
        });
        t.present();
      },
      error: async () => {
        const t = await this.toasts.create({
          message: `Código no encontrado: ${code}`,
          duration: 1800,
          position: 'top',
          color: 'danger',
        });
        t.present();
        this.code = '';
      },
    });
  }

  /** Escaneo con cámara vía BarcodeDetector (Chrome/Android y WebView modernos). */
  async startCamera() {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      const a = await this.alerts.create({
        header: 'Cámara no soportada aquí',
        message: 'Este navegador no trae BarcodeDetector. En el teléfono (Chrome/Android o app nativa) sí funciona; mientras tanto usa el campo manual.',
        buttons: ['OK'],
      });
      a.present();
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.scanning = true;
      setTimeout(() => {
        const video = this.videoRef!.nativeElement;
        video.srcObject = this.stream!;
        video.play();
        const detector = new Detector({ formats: ['ean_13', 'code_128', 'qr_code'] });
        const tick = async () => {
          if (!this.scanning) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length) {
              this.code = codes[0].rawValue;
              await this.scan();
            }
          } catch {}
          requestAnimationFrame(tick);
        };
        tick();
      });
    } catch {
      this.scanning = false;
    }
  }

  stopCamera() {
    this.scanning = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
  }

  async closeCount(apply: boolean) {
    if (!this.active) return;
    const a = await this.alerts.create({
      header: apply ? '¿Cerrar y ajustar stock?' : '¿Cerrar sin ajustar?',
      message: apply
        ? 'El stock de cada producto quedará igual a lo contado.'
        : 'Se guarda el conteo pero el stock no cambia.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: () => {
            this.api.closeCount(this.active!.id, apply).subscribe(() => {
              this.active = undefined;
              this.stopCamera();
              this.loadCounts();
            });
          },
        },
      ],
    });
    a.present();
  }

  diff(expected: number, counted: number) {
    return counted - expected;
  }
}
