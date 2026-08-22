import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

// En el navegador/simulador apunta a localhost.
// En un teléfono real cambia por la IP LAN de tu Mac, ej: http://192.168.1.20:3010/api
export const API_URL = 'http://localhost:3010/api';
export const FILES_URL = 'http://localhost:3010';

export interface Summary {
  totals: { ventas: number; total: number; neto: number; iva: number };
  topProducts: { name: string; unidades: number; total: number }[];
  lastSales?: {
    id: string;
    number: number;
    total: number;
    payment: string;
    createdAt: string;
    items: { quantity: number; product: { name: string } }[];
    boleta?: { folio: number };
  }[];
}

export interface InventoryCount {
  id: string;
  note?: string;
  status: 'ABIERTO' | 'CERRADO';
  createdAt: string;
  items?: CountItem[];
  _count?: { items: number };
}

export interface CountItem {
  id: string;
  productId: string;
  barcode: string;
  expected: number;
  counted: number;
  product?: { name: string };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  today() {
    return this.http.get<Summary>(`${API_URL}/reports/today`);
  }

  counts() {
    return this.http.get<InventoryCount[]>(`${API_URL}/inventory/counts`);
  }

  openCount(note?: string) {
    return this.http.post<InventoryCount>(`${API_URL}/inventory/counts`, { note });
  }

  getCount(id: string) {
    return this.http.get<InventoryCount>(`${API_URL}/inventory/counts/${id}`);
  }

  scan(countId: string, barcode: string, qty = 1) {
    return this.http.post<CountItem & { product: { name: string } }>(
      `${API_URL}/inventory/counts/${countId}/scan`,
      { barcode, qty },
    );
  }

  closeCount(id: string, apply: boolean) {
    return this.http.post<InventoryCount>(`${API_URL}/inventory/counts/${id}/close`, { apply });
  }

  docs() {
    return this.http.get<PurchaseDoc[]>(`${API_URL}/purchase-docs`);
  }

  createDoc(fd: FormData) {
    return this.http.post<PurchaseDoc>(`${API_URL}/purchase-docs`, fd);
  }

  fileUrl(path: string) {
    return `${FILES_URL}${path}`;
  }
}

export interface PurchaseDoc {
  id: string;
  type: 'GUIA' | 'FACTURA';
  supplier?: string;
  folio?: string;
  docDate?: string;
  amount?: number;
  note?: string;
  imageUrl: string;
  createdAt: string;
}
