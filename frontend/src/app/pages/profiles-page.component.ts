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
import { RouterLink } from '@angular/router';
import { ApiService, Perfil } from '../core/api.service';
import { IconComponent } from '../core/icon.component';
import { ReportService } from '../core/report.service';
import { clearHost, drawPie, drawMetricFacets } from '../core/charts';
import { DATA_SOURCES, TEAM } from '../core/credits';

const PALETTE = ['#4b1c71', '#7f4ca5', '#b57edc', '#9d4edd', '#5a189a'];

@Component({
  selector: 'app-profiles-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="absolute inset-0 overflow-auto bg-[var(--surface)] p-5 md:p-7">
      <section class="panel-card mb-5 p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex flex-wrap items-start gap-3">
            <div class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50">
              <app-icon icon="line-md:account" [size]="28" color="#4b1c71" animate="float" />
            </div>
            <div>
              <p class="chip mb-1">Reto 1 · ¿Qué tipos de ciudadanía existen?</p>
              <h2 class="text-2xl font-bold text-brand-900">Catálogo de perfiles ciudadanos</h2>
              <p class="mt-1 max-w-3xl text-sm text-brand-700">
                Segmentación K-Means con edad, sexo, escolaridad, nivel socioeconómico e historial
                electoral agregado (sin datos personales).
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
          <h3 class="mb-1 text-sm font-bold text-brand-900">Peso de cada perfil en la ZMG</h3>
          <p class="mb-2 text-[11px] text-brand-700">Pastel por número de colonias</p>
          <div #pieHost></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-1 text-sm font-bold text-brand-900">Comparativo por variable</h3>
          <p class="mb-2 text-[11px] text-brand-700">Barras por perfil (P0–P4) en cada métrica CCPC</p>
          <div #radarHost></div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (p of perfiles(); track p.cluster_id) {
          <article class="panel-card relative overflow-hidden p-5 transition hover:-translate-y-0.5">
            <div class="absolute inset-x-0 top-0 h-1.5" [style.background]="p.color"></div>
            <div class="mb-3 flex items-center justify-between">
              <span class="chip">Cluster {{ p.cluster_id }}</span>
              <span class="h-8 w-8 rounded-xl ring-1 ring-black/5" [style.background]="p.color"></span>
            </div>
            <h3 class="text-lg font-bold leading-snug text-brand-900">{{ p.nombre }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-brand-700">{{ p.descripcion }}</p>
            <dl class="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-2xl bg-brand-50 p-2.5">
                <dt class="text-brand-700">Colonias</dt>
                <dd class="text-base font-bold text-brand-900">{{ p.n_colonias }} <span class="text-xs font-medium">({{ p.pct_universo }}%)</span></dd>
              </div>
              <div class="rounded-2xl bg-brand-50 p-2.5">
                <dt class="text-brand-700">Part. 2024</dt>
                <dd class="text-base font-bold text-brand-900">{{ p.metricas['tasa_2024'] }}%</dd>
              </div>
              <div class="rounded-2xl bg-brand-50 p-2.5">
                <dt class="text-brand-700">% joven</dt>
                <dd class="font-bold text-brand-900">{{ p.metricas['pct_joven_prom'] }}%</dd>
              </div>
              <div class="rounded-2xl bg-brand-50 p-2.5">
                <dt class="text-brand-700">Nivel socioeconómico</dt>
                <dd class="font-bold text-brand-900">{{ p.metricas['nse_prom'] }}</dd>
              </div>
              <div class="rounded-2xl bg-brand-50 p-2.5">
                <dt class="text-brand-700">Escolaridad</dt>
                <dd class="font-bold text-brand-900">{{ p.metricas['escolaridad_prom'] }} años</dd>
              </div>
              <div class="rounded-2xl bg-brand-50 p-2.5">
                <dt class="text-brand-700">Población</dt>
                <dd class="font-bold text-brand-900">{{ p.metricas['poblacion'] | number }}</dd>
              </div>
            </dl>
            <a routerLink="/campanas" [queryParams]="{c: p.cluster_id}"
              class="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
              <app-icon icon="line-md:arrow-right" [size]="16" color="#fff" />
              Ver estrategia
            </a>
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
export class ProfilesPageComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private report = inject(ReportService);
  perfiles = signal<Perfil[]>([]);
  meta: any;
  sources = DATA_SOURCES;
  team = TEAM;
  pieHost = viewChild.required<ElementRef<HTMLDivElement>>('pieHost');
  radarHost = viewChild.required<ElementRef<HTMLDivElement>>('radarHost');

  ngOnInit() {
    this.api.perfiles().subscribe((p) => {
      this.meta = p;
      const colored = p.perfiles.map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
      this.perfiles.set(colored);
      queueMicrotask(() => this.render(colored));
    });
  }

  ngOnDestroy() {
    try { clearHost(this.pieHost().nativeElement); } catch { /* */ }
    try { clearHost(this.radarHost().nativeElement); } catch { /* */ }
  }

  exportPdf() {
    this.report.downloadInforme(this.perfiles(), {
      n_colonias: this.meta?.n_colonias,
      k: this.meta?.k,
      municipios: this.meta?.municipios,
    });
  }

  private render(rows: Perfil[]) {
    drawPie(
      this.pieHost().nativeElement,
      rows.map((r) => ({ nombre: r.nombre, color: r.color, value: r.n_colonias })),
    );
    drawMetricFacets(
      this.radarHost().nativeElement,
      rows.map((p) => ({
        nombre: p.nombre,
        color: p.color,
        values: {
          part: Number(p.metricas['tasa_2024'] || 0),
          joven: Number(p.metricas['pct_joven_prom'] || 0),
          mayor: Number(p.metricas['pct_mayor_prom'] || 0),
          mujer: Number(p.metricas['pct_mujer_prom'] || 0),
          esc: Number(p.metricas['escolaridad_prom'] || 0),
          nse: Number(p.metricas['nse_prom'] || 0),
        },
      })),
      [
        { key: 'part', label: 'Participación 2024', max: 100, unit: '%' },
        { key: 'joven', label: '% jóvenes 18–24', max: 40, unit: '%' },
        { key: 'mayor', label: '% adultos 60+', max: 40, unit: '%' },
        { key: 'mujer', label: '% mujeres', max: 60, unit: '%' },
        { key: 'esc', label: 'Escolaridad (años)', max: 16 },
        { key: 'nse', label: 'Nivel socioeconómico', max: 9 },
      ],
    );
  }
}
