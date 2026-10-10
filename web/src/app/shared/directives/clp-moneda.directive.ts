import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Input de dinero CLP: muestra puntos de miles mientras se escribe (12345 → "12.345")
 * pero el modelo (ngModel) recibe siempre el número entero. Usar con type="text".
 */
@Directive({
  selector: 'input[clpMoneda]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ClpMonedaDirective),
      multi: true,
    },
  ],
})
export class ClpMonedaDirective implements ControlValueAccessor {
  private onChange: (v: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  handleInput() {
    const input = this.el.nativeElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 12);
    const num = digitos ? Number(digitos) : null;

    // mantener el cursor relativo al final mientras se re-formatea
    const desdeElFinal = input.value.length - (input.selectionStart ?? input.value.length);
    input.value = num != null ? num.toLocaleString('es-CL') : '';
    const pos = Math.max(input.value.length - desdeElFinal, 0);
    input.setSelectionRange(pos, pos);

    this.onChange(num);
  }

  @HostListener('blur')
  handleBlur() {
    this.onTouched();
  }

  writeValue(v: number | string | null): void {
    const num = v == null || v === '' ? null : Math.round(Number(v));
    this.el.nativeElement.value = num != null && !isNaN(num) ? num.toLocaleString('es-CL') : '';
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.el.nativeElement.disabled = disabled;
  }
}
