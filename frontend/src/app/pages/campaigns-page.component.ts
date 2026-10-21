import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService, Perfil } from '../core/api.service';
import { IconComponent } from '../core/icon.component';
import { ReportService } from '../core/report.service';
import { clearHost, drawBar, drawPie } from '../core/charts';
import { DATA_SOURCES, TEAM } from '../core/credits';

const PALETTE = ['#4b1c71', '#7f4ca5', '#b57edc', '#9d4edd', '#5a189a'];

@Component({
  selector: 'app-campaigns-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IconComponent],
  template: `
    <div class="absolute inset-0 overflow-auto bg-[var(--surface)] p-5 md:p-7">
      <section class="panel-card mb-5 p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex flex-wrap items-start gap-3">
            <div class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50">
              <app-icon icon="line-md:bell-alert-twotone-loop" [size]="28" color="#4b1c71" />
            </div>
            <div>
              <p class="chip mb-1">Para el INE · campañas focalizadas</p>
              <h2 class="text-2xl font-bold text-brand-900">Estrategias diferenciadas</h2>
              <p class="mt-1 max-w-3xl text-sm text-brand-700">
                Mensaje, canales y acciones por perfil — listo para priorizar territorio en la ZMG.
              </p>
            </div>
          </div>
          <button type="button" class="fab-brand !py-2.5 !text-xs" (click)="exportPdf()">
            <span class="inline-flex items-center gap-2">
              <app-icon icon="line-md:download-loop" [size]="16" color="#fff" />
              Informe PDF
            </span>
          </button>
        </div>
      </section>

      <div class="mb-4 grid gap-4 lg:grid-cols-2">
        <div class="panel-card p-4">
          <h3 class="mb-1 text-sm font-bold text-brand-900">Alcance territorial (colonias)</h3>
          <div #barHost></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-1 text-sm font-bold text-brand-900">Población por perfil (pastel)</h3>
          <div #pieHost></div>
        </div>
      </div>

      <div class="space-y-4">
        @for (p of perfiles(); track p.cluster_id) {
          <article class="panel-card p-5"
            [class.ring-2]="highlight() === p.cluster_id"
            [style.--tw-ring-color]="p.color">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" [style.color]="p.color">
                  <app-icon icon="line-md:target" [size]="14" [color]="p.color" />
                  Perfil {{ p.cluster_id }} · {{ p.n_colonias }} colonias · NSE {{ p.metricas['nse_prom'] }}
                </p>
                <h3 class="mt-1 text-xl font-bold text-brand-900">{{ p.nombre }}</h3>
              </div>
              <p class="max-w-md rounded-2xl bg-brand-50 px-4 py-3 text-sm italic text-brand-900">
                “{{ p.estrategia.mensaje }}”
              </p>
            </div>
            <div class="mt-5 grid gap-3 md:grid-cols-3">
              <div class="rounded-2xl bg-brand-50/80 p-3">
                <h4 class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-brand-700">
                  <app-icon icon="line-md:cellphone" [size]="14" color="#7f4ca5" /> Canales
                </h4>
                <ul class="space-y-1.5 text-sm text-brand-900">
                  @for (c of p.estrategia.canales; track c) {
                    <li class="flex items-start gap-2">
                      <app-icon icon="line-md:confirm" [size]="14" color="#4b1c71" />
                      <span>{{ c }}</span>
                    </li>
                  }
                </ul>
              </div>
              <div class="rounded-2xl bg-brand-50/80 p-3">
                <h4 class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-brand-700">
                  <app-icon icon="line-md:edit-twotone" [size]="14" color="#7f4ca5" /> Tono
                </h4>
                <p class="text-sm leading-relaxed text-brand-900">{{ p.estrategia.tono }}</p>
              </div>
              <div class="rounded-2xl bg-brand-50/80 p-3">
                <h4 class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-brand-700">
                  <app-icon icon="line-md:list-3" [size]="14" color="#7f4ca5" /> Acciones
                </h4>
                <ul class="space-y-1.5 text-sm text-brand-900">
                  @for (a of p.estrategia.acciones; track a) {
                    <li class="flex items-start gap-2">
                      <app-icon icon="line-md:arrow-small-right" [size]="14" color="#4b1c71" />
                      <span>{{ a }}</span>
                    </li>
                  }
                </ul>
              </div>
            </div>
          </article>
        }
      </div>

      <section class="panel-card mt-4 p-4 text-[11px] leading-relaxed text-brand-700">
        <p class="font-bold uppercase tracking-wider text-brand-900">Fuentes:</p>
        <ul class="mt-1 list-disc pl-4">@for (s of sources; track s) { <li>{{ s }}</li> }</ul>
        <p class="mt-3 font-bold uppercase tracking-wider text-brand-900">Elaboración:</p>
        <p class="mt-1">{{ team.join(' · ') }}</p>
      </section>
    </div>
  `,
})
export class CampaignsPageComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private report = inject(ReportService);
  perfiles = signal<Perfil[]>([]);
  highlight = signal<number | null>(null);
  meta: any;
  sources = DATA_SOURCES;
  team = TEAM;
  barHost = viewChild.required<ElementRef<HTMLDivElement>>('barHost');
  pieHost = viewChild.required<ElementRef<HTMLDivElement>>('pieHost');

  ngOnInit() {
    const c = this.route.snapshot.queryParamMap.get('c');
    if (c != null) this.highlight.set(+c);
    this.api.perfiles().subscribe((p) => {
      this.meta = p;
      const colored = p.perfiles.map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
      this.perfiles.set(colored);
      queueMicrotask(() => this.render(colored));
    });
  }

  ngOnDestroy() {
    try { clearHost(this.barHost().nativeElement); } catch { /* */ }
    try { clearHost(this.pieHost().nativeElement); } catch { /* */ }
  }

  exportPdf() {
    this.report.downloadInforme(this.perfiles(), {
      n_colonias: this.meta?.n_colonias,
      k: this.meta?.k,
      municipios: this.meta?.municipios,
    });
  }

  private render(rows: Perfil[]) {
    drawBar(
      this.barHost().nativeElement,
      rows.map((r) => ({ nombre: r.nombre, color: r.color, value: r.n_colonias })),
      { height: 260 },
    );
    drawPie(
      this.pieHost().nativeElement,
      rows.map((r) => ({
        nombre: r.nombre,
        color: r.color,
        value: Math.max(1, Number(r.metricas['poblacion'] || r.n_colonias)),
      })),
      260,
    );
  }
}
