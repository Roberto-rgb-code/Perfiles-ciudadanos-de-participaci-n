import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';

/**
 * Wrapper Iconify (https://icones.js.org/) — colecciones animadas line-md / svg-spinners.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <span class="inline-flex items-center justify-center" [class]="wrapClass" [style.color]="color">
      <iconify-icon
        [attr.icon]="icon"
        [attr.width]="size"
        [attr.height]="size"
        [class.icon-float]="animate === 'float'"
        style="display:block">
      </iconify-icon>
    </span>
  `,
})
export class IconComponent {
  @Input({ required: true }) icon!: string;
  @Input() size: string | number = 22;
  @Input() color = 'currentColor';
  @Input() animate: 'none' | 'float' | 'pulse' = 'none';
  @Input() wrapClass = '';
}
