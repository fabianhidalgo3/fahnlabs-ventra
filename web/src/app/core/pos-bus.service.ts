import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Product } from './api.service';

/** Canal simple para que el buscador global agregue productos al carrito del POS. */
@Injectable({ providedIn: 'root' })
export class PosBusService {
  private addSubject = new Subject<Product>();
  add$ = this.addSubject.asObservable();

  add(product: Product) {
    this.addSubject.next(product);
  }
}
