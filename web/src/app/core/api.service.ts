import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Rutas relativas: en dev las resuelve el proxy de ng serve (proxy.conf.json)
// y así la app funciona igual detrás de un túnel público.
export const API_URL = '/api';
export const FILES_URL = '';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
  active: boolean;
  categoryId?: string;
  category?: { id: string; name: string };
  nextExpiry?: string | null;
  daysToExpiry?: number | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface BatchAlert {
  id: string;
  lotCode: string;
  quantity: number;
  expiresAt: string;
  daysToExpiry: number;
  level: 'vencido' | 'critico' | 'alerta' | 'proximo' | 'ok';
  product: { id: string; name: string; sku: string; barcode: string };
}

export interface Sale {
  id: string;
  number: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment: string;
  tendered?: number;
  change?: number;
  voidedAt?: string | null;
  createdAt: string;
  items: {
    quantity: number;
    unitPrice: number;
    total: number;
    product: Product;
  }[];
  boleta?: { folio: number; pdfPath?: string };
}

export type PromoType = 'PORCENTAJE' | 'PACK_PRECIO' | 'NXM';

export interface Promotion {
  id: string;
  name: string;
  type: PromoType;
  percent?: number | null;
  packQty?: number | null;
  packPrice?: number | null;
  nTake?: number | null;
  mPay?: number | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  products?: { productId: string; product: { id: string; name: string } }[];
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface PromoQuote {
  bruto: number;
  promoDiscount: number;
  detail: { productId: string; promoName: string; discount: number }[];
}

export interface Summary {
  from: string;
  to: string;
  groupBy: string;
  totals: { ventas: number; total: number; neto: number; iva: number };
  series: { bucket: string; ventas: number; total: number }[];
  topProducts: { name: string; unidades: number; total: number }[];
  lastSales?: Sale[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Productos
  products(search = '', all = false): Observable<Product[]> {
    return this.http.get<Product[]>(`${API_URL}/products`, {
      params: { search, all },
    });
  }
  product(id: string) {
    return this.http.get<Product>(`${API_URL}/products/${id}`);
  }
  byBarcode(code: string) {
    return this.http.get<Product>(`${API_URL}/products/by-barcode/${code}`);
  }
  createProduct(data: Partial<Product>) {
    return this.http.post<Product>(`${API_URL}/products`, data);
  }
  updateProduct(id: string, data: Partial<Product>) {
    return this.http.patch<Product>(`${API_URL}/products/${id}`, data);
  }
  deleteProduct(id: string) {
    return this.http.delete(`${API_URL}/products/${id}`);
  }
  uploadImage(id: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Product>(`${API_URL}/products/${id}/image`, fd);
  }
  bulkPercent(percent: number, categoryId?: string) {
    return this.http.post<{ updated: number }>(
      `${API_URL}/products/price-bulk`,
      { percent, categoryId },
    );
  }
  priceImport(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ totalRows: number; updated: number; notFound: string[] }>(
      `${API_URL}/products/price-import`,
      fd,
    );
  }
  categories() {
    return this.http.get<Category[]>(`${API_URL}/products/categories`);
  }
  createCategory(name: string) {
    return this.http.post<Category>(`${API_URL}/products/categories`, { name });
  }
  private get tokenParam() {
    const t = localStorage.getItem('ventra_token');
    return t ? `token=${t}` : '';
  }
  barcodeUrl(id: string) {
    return `${API_URL}/products/${id}/barcode.png?${this.tokenParam}`;
  }
  qrUrl(id: string) {
    return `${API_URL}/products/${id}/qr.png?${this.tokenParam}`;
  }

  // Lotes / vencimientos
  alerts(days = 30) {
    return this.http.get<BatchAlert[]>(`${API_URL}/batches/alerts`, {
      params: { days },
    });
  }
  createBatch(data: { productId: string; lotCode: string; quantity: number; expiresAt: string }) {
    return this.http.post(`${API_URL}/batches`, data);
  }

  // Ventas
  createSale(
    items: { barcode?: string; productId?: string; quantity: number }[],
    payment: string,
    discount = 0,
    tendered?: number,
  ) {
    return this.http.post<Sale>(`${API_URL}/sales`, { items, payment, discount, tendered });
  }
  voidSale(id: string) {
    return this.http.post<Sale>(`${API_URL}/sales/${id}/void`, {});
  }

  // Ofertas / promociones
  promotions() {
    return this.http.get<Promotion[]>(`${API_URL}/promotions`);
  }
  createPromotion(data: Partial<Promotion> & { productIds?: string[] }) {
    return this.http.post<Promotion>(`${API_URL}/promotions`, data);
  }
  updatePromotion(id: string, data: Partial<Promotion> & { productIds?: string[] }) {
    return this.http.patch<Promotion>(`${API_URL}/promotions/${id}`, data);
  }
  quote(items: { productId: string; quantity: number }[]) {
    return this.http.post<PromoQuote>(`${API_URL}/promotions/quote`, { items });
  }

  // Caja
  cashCurrent() {
    return this.http.get<CashSummary>(`${API_URL}/cash/current`);
  }
  cashOpen(openingCash: number) {
    return this.http.post<CashSession>(`${API_URL}/cash/open`, { openingCash });
  }
  cashClose(countedCash: number, note?: string) {
    return this.http.post<CashSession>(`${API_URL}/cash/close`, { countedCash, note });
  }
  cashHistory() {
    return this.http.get<CashSession[]>(`${API_URL}/cash/history`);
  }
  sales(from?: string, to?: string) {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<Sale[]>(`${API_URL}/sales`, { params });
  }

  // Reportes
  today() {
    return this.http.get<Summary>(`${API_URL}/reports/today`);
  }
  summary(from: string, to: string, groupBy: 'day' | 'week' | 'month') {
    return this.http.get<Summary>(`${API_URL}/reports/summary`, {
      params: { from, to, groupBy },
    });
  }
  exportUrl(kind: 'xlsx' | 'pdf', from: string, to: string) {
    return `${API_URL}/reports/export.${kind}?from=${from}&to=${to}&${this.tokenParam}`;
  }
  fileUrl(path?: string) {
    return path ? `${FILES_URL}${path}` : '';
  }

  // Asistente IA (Ollama local)
  ask(question: string) {
    return this.http.post<{ answer: string }>(`${API_URL}/assistant/ask`, { question });
  }
  dailyBrief() {
    return this.http.get<{ text: string }>(`${API_URL}/assistant/daily-brief`);
  }
  whatsappStatus() {
    return this.http.get<{
      status: string;
      qrDataUrl: string | null;
      numero: string | null;
      lastError: string | null;
    }>(`${API_URL}/whatsapp/status`);
  }
  whatsappRestart() {
    return this.http.post(`${API_URL}/whatsapp/restart`, {});
  }
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  countedCash?: number;
  expectedCash?: number;
  difference?: number;
  note?: string;
  status: 'ABIERTA' | 'CERRADA';
}

export interface CashSummary {
  session: CashSession | null;
  byPayment?: Record<string, { ventas: number; total: number }>;
  totalVentas?: number;
  ventas?: number;
  expectedCash?: number;
}

/** Abre WhatsApp con un mensaje listo para elegir contacto y enviar. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
