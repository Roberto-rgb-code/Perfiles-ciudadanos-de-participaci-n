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
import { ApiService, Perfil } from '../core/api.service';
import { IconComponent } from '../core/icon.component';
import { ReportService } from '../core/report.service';
import { clearHost, drawBar, drawPie, drawMetricFacets } from '../core/charts';
import { DATA_SOURCES, TEAM } from '../core/credits';

const PALETTE = ['#4b1c71', '#7f4ca5', '#b57edc', '#9d4edd', '#5a189a'];

@Component({
  selector: 'app-stats-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IconComponent],
  template: `
    <div class="absolute inset-0 overflow-auto bg-[var(--surface)] p-5 md:p-7">
      <section class="panel-card mb-5 p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex flex-wrap items-start gap-3">
            <div class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50">
              <app-icon icon="line-md:speedometer-loop" [size]="28" color="#4b1c71" />
            </div>
            <div>
              <h2 class="text-2xl font-bold text-brand-900">Estadísticas del universo ZMG</h2>
              <p class="mt-1 text-sm text-brand-700">
                Lectura para jueces: distribución de perfiles, participación y radar sociodemográfico.
              </p>
              <p class="mt-1 text-sm text-brand-700">
                <b>{{ stats()?.n_colonias }}</b> colonias · <b>k={{ stats()?.k }}</b>
              </p>
            </div>
          </div>
          <button type="button" class="fab-brand !py-2.5 !text-xs" (click)="exportPdf()">
            <span class="inline-flex items-center gap-2">
              <app-icon icon="line-md:download-loop" [size]="16" color="#fff" />
              Descargar informe PDF
            </span>
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          @for (m of stats()?.municipios || []; track m) {
            <span class="chip">
              <app-icon icon="line-md:map-marker" [size]="12" color="#7f4ca5" />
              {{ m }}
            </span>
          }
        </div>
      </section>

      <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (k of kpi(); track k.label) {
          <div class="panel-card p-4">
            <p class="text-[10px] font-bold uppercase tracking-wider text-brand-700">{{ k.label }}</p>
            <p class="mt-1 text-2xl font-bold tabular-nums text-brand-900">{{ k.value }}</p>
            <p class="text-[11px] text-brand-700">{{ k.hint }}</p>
          </div>
        }
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="panel-card p-4">
          <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-brand-900">
            <app-icon icon="line-md:chart-bar" [size]="18" color="#4b1c71" />
            Colonias por perfil
          </h3>
          <div #barHost class="w-full overflow-x-auto"></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-brand-900">
            <app-icon icon="line-md:circle-to-confirm-circle-transition" [size]="18" color="#7f4ca5" />
            Composición del universo (pastel)
          </h3>
          <div #pieHost class="w-full"></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-brand-900">
            <app-icon icon="line-md:coffee-half-empty-twotone-loop" [size]="18" color="#7f4ca5" />
            Participación electoral 2024
          </h3>
          <div #partHost class="w-full overflow-x-auto"></div>
        </div>
        <div class="panel-card p-4 lg:col-span-2">
          <h3 class="mb-2 flex items-center gap-2 text-sm font-bold text-brand-900">
            <app-icon icon="line-md:chart-bar" [size]="18" color="#4b1c71" />
            Comparativo por variable (una métrica = un panel)
          </h3>
          <p class="mb-2 text-[11px] text-brand-700">
            Cada bloque muestra los 5 perfiles (P0–P4) en la misma escala: fácil de leer para evaluación del Reto 1.
          </p>
          <div #radarHost class="w-full"></div>
        </div>
      </div>

      <section class="panel-card mt-4 p-4 text-[11px] leading-relaxed text-brand-700">
        <p class="font-bold uppercase tracking-wider text-brand-900">Fuentes:</p>
        <ul class="mt-1 list-disc pl-4">
          @for (s of sources; track s) { <li>{{ s }}</li> }
        </ul>
        <p class="mt-3 font-bold uppercase tracking-wider text-brand-900">Elaboración:</p>
        <p class="mt-1">{{ team.join(' · ') }}</p>
      </section>
    </div>
  `,
})
export class StatsPageComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private report = inject(ReportService);
  stats = signal<any>(null);
  perfiles = signal<Perfil[]>([]);
  kpi = signal<{ label: string; value: string; hint: string }[]>([]);
  sources = DATA_SOURCES;
  team = TEAM;
  barHost = viewChild.required<ElementRef<HTMLDivElement>>('barHost');
  pieHost = viewChild.required<ElementRef<HTMLDivElement>>('pieHost');
  partHost = viewChild.required<ElementRef<HTMLDivElement>>('partHost');
  radarHost = viewChild.required<ElementRef<HTMLDivElement>>('radarHost');

  ngOnInit() {
    this.api.perfiles().subscribe((p) => {
      const colored = p.perfiles.map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
      this.perfiles.set(colored);
      this.api.stats().subscribe((s) => {
        const rows = (s.por_cluster || []).map((r: any, i: number) => ({
          ...r,
          color: PALETTE[i % PALETTE.length],
        }));
        this.stats.set({ ...s, por_cluster: rows });
        const pop = colored.reduce((a, x) => a + Number(x.metricas['poblacion'] || 0), 0);
        const partAvg =
          colored.reduce((a, x) => a + Number(x.metricas['tasa_2024'] || 0) * x.n_colonias, 0) /
          (p.n_colonias || 1);
        this.kpi.set([
          { label: 'Colonias', value: String(p.n_colonias), hint: 'Unidades espaciales ZMG' },
          { label: 'Perfiles', value: String(p.k), hint: 'Clusters K-Means' },
          { label: 'Población cubierta', value: pop.toLocaleString('es-MX'), hint: 'Suma POBTOT por perfil' },
          { label: 'Part. 2024 media', value: `${partAvg.toFixed(1)}%`, hint: 'Ponderada por colonias' },
        ]);
        queueMicrotask(() => this.render(rows, colored));
      });
    });
  }

  ngOnDestroy() {
    [this.barHost, this.pieHost, this.partHost, this.radarHost].forEach((h) => {
      try { clearHost(h().nativeElement); } catch { /* empty */ }
    });
  }

  exportPdf() {
    this.report.downloadInforme(this.perfiles(), {
      n_colonias: this.stats()?.n_colonias,
      k: this.stats()?.k,
      municipios: this.stats()?.municipios,
    });
  }

  private render(rows: any[], perfiles: Perfil[]) {
    drawBar(
      this.barHost().nativeElement,
      rows.map((r) => ({ nombre: r.nombre, color: r.color, value: Number(r.n_colonias) })),
    );
    drawPie(
      this.pieHost().nativeElement,
      rows.map((r) => ({ nombre: r.nombre, color: r.color, value: Number(r.n_colonias) })),
    );
    drawBar(
      this.partHost().nativeElement,
      rows.map((r) => ({ nombre: r.nombre, color: r.color, value: Number(r.tasa_2024) })),
      { pct: true },
    );
    drawMetricFacets(
      this.radarHost().nativeElement,
      perfiles.map((p) => ({
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
