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
  total: number;
  payment: string;
  createdAt: string;
  items: {
    quantity: number;
    unitPrice: number;
    total: number;
    product: Product;
  }[];
  boleta?: { folio: number; pdfPath?: string };
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
  createSale(items: { barcode?: string; productId?: string; quantity: number }[], payment: string) {
    return this.http.post<Sale>(`${API_URL}/sales`, { items, payment });
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
}
