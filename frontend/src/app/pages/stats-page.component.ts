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
import { FormsModule } from '@angular/forms';
import { ApiService, Perfil } from '../core/api.service';
import { IconComponent } from '../core/icon.component';
import { ReportService } from '../core/report.service';
import { clearHost, drawBar, drawPie, drawMetricFacets } from '../core/charts';
import { DATA_SOURCES, TEAM } from '../core/credits';
import { ZMG_MUNICIPIOS } from '../core/zmg';

const PALETTE = ['#4b1c71', '#7f4ca5', '#b57edc', '#9d4edd', '#5a189a'];

@Component({
  selector: 'app-stats-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule, IconComponent],
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
                Distribución de perfiles, participación y comparativo por variable.
              </p>
              <p class="mt-1 text-sm text-brand-700">
                Mostrando <b>{{ filtered().length }}</b> / {{ allPerfiles().length }} perfiles ·
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

        <!-- Filtros y buscador -->
        <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-700">Buscar perfil</span>
            <input
              class="filter-input"
              type="search"
              placeholder="Nombre, descripción…"
              [ngModel]="query()"
              (ngModelChange)="query.set($event); apply()"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-700">Part. 2024 mín.</span>
            <select class="filter-input" [ngModel]="minPart()" (ngModelChange)="minPart.set(+$event); apply()">
              <option [ngValue]="0">Todas</option>
              <option [ngValue]="50">≥ 50%</option>
              <option [ngValue]="55">≥ 55%</option>
              <option [ngValue]="60">≥ 60%</option>
              <option [ngValue]="65">≥ 65%</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-700">Ordenar</span>
            <select class="filter-input" [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event); apply()">
              <option value="colonias">Más colonias</option>
              <option value="part">Mayor participación</option>
              <option value="nombre">Nombre A–Z</option>
            </select>
          </label>
        </div>

        <div class="mt-3">
          <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
            Filtrar por perfil (clic para activar/desactivar)
          </p>
          <div class="flex flex-wrap gap-2">
            @for (p of allPerfiles(); track p.cluster_id) {
              <button
                type="button"
                class="chip-filter"
                [class.active]="selectedIds().has(p.cluster_id)"
                (click)="toggleProfile(p.cluster_id)"
              >
                <span class="h-2 w-2 rounded-full" [style.background]="p.color"></span>
                {{ p.nombre }}
              </button>
            }
            <button type="button" class="chip-filter" (click)="selectAll()">Todos</button>
          </div>
        </div>

        <div class="mt-3 rounded-2xl bg-brand-50/70 px-3 py-2.5">
          <p class="text-[10px] font-bold uppercase tracking-wider text-brand-700">
            Cobertura geográfica ZMG ({{ zmgMunis.length }} municipios) — no son filtros; indican el universo espacial
          </p>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            @for (m of zmgMunis; track m) {
              <span class="chip !bg-white">
                <app-icon icon="line-md:map-marker" [size]="12" color="#7f4ca5" />
                {{ m }}
              </span>
            }
          </div>
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
          <h3 class="mb-2 text-sm font-bold text-brand-900">Colonias por perfil</h3>
          <div #barHost class="w-full overflow-x-auto"></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-2 text-sm font-bold text-brand-900">Composición (pastel)</h3>
          <div #pieHost class="w-full"></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-2 text-sm font-bold text-brand-900">Participación electoral 2024</h3>
          <div #partHost class="w-full overflow-x-auto"></div>
        </div>
        <div class="panel-card p-4 lg:col-span-2">
          <h3 class="mb-2 text-sm font-bold text-brand-900">Comparativo por variable</h3>
          <div #radarHost class="w-full"></div>
        </div>
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
export class StatsPageComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private report = inject(ReportService);
  stats = signal<any>(null);
  allPerfiles = signal<Perfil[]>([]);
  filtered = signal<Perfil[]>([]);
  selectedIds = signal<Set<number>>(new Set());
  query = signal('');
  minPart = signal(0);
  sortBy = signal<'colonias' | 'part' | 'nombre'>('colonias');
  kpi = signal<{ label: string; value: string; hint: string }[]>([]);
  sources = DATA_SOURCES;
  team = TEAM;
  zmgMunis = ZMG_MUNICIPIOS;
  barHost = viewChild.required<ElementRef<HTMLDivElement>>('barHost');
  pieHost = viewChild.required<ElementRef<HTMLDivElement>>('pieHost');
  partHost = viewChild.required<ElementRef<HTMLDivElement>>('partHost');
  radarHost = viewChild.required<ElementRef<HTMLDivElement>>('radarHost');

  ngOnInit() {
    this.api.perfiles().subscribe((p) => {
      const colored = p.perfiles.map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
      this.allPerfiles.set(colored);
      this.selectedIds.set(new Set(colored.map((x) => x.cluster_id)));
      this.api.stats().subscribe((s) => {
        this.stats.set(s);
        this.apply();
      });
    });
  }

  ngOnDestroy() {
    [this.barHost, this.pieHost, this.partHost, this.radarHost].forEach((h) => {
      try { clearHost(h().nativeElement); } catch { /* */ }
    });
  }

  toggleProfile(id: number) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
    this.apply();
  }

  selectAll() {
    this.selectedIds.set(new Set(this.allPerfiles().map((p) => p.cluster_id)));
    this.apply();
  }

  apply() {
    const q = this.query().trim().toLowerCase();
    const min = this.minPart();
    const ids = this.selectedIds();
    let rows = this.allPerfiles().filter((p) => {
      if (!ids.has(p.cluster_id)) return false;
      if (Number(p.metricas['tasa_2024'] || 0) < min) return false;
      if (!q) return true;
      const hay = `${p.nombre} ${p.descripcion} ${p.slug}`.toLowerCase();
      return hay.includes(q);
    });
    const sort = this.sortBy();
    rows = [...rows].sort((a, b) => {
      if (sort === 'part') return Number(b.metricas['tasa_2024']) - Number(a.metricas['tasa_2024']);
      if (sort === 'nombre') return a.nombre.localeCompare(b.nombre, 'es');
      return b.n_colonias - a.n_colonias;
    });
    this.filtered.set(rows);
    const pop = rows.reduce((a, x) => a + Number(x.metricas['poblacion'] || 0), 0);
    const colSum = rows.reduce((a, x) => a + x.n_colonias, 0) || 1;
    const partAvg = rows.reduce((a, x) => a + Number(x.metricas['tasa_2024'] || 0) * x.n_colonias, 0) / colSum;
    this.kpi.set([
      { label: 'Colonias (filtro)', value: String(rows.reduce((a, x) => a + x.n_colonias, 0)), hint: 'Suma de perfiles visibles' },
      { label: 'Perfiles visibles', value: String(rows.length), hint: 'Tras búsqueda / filtros' },
      { label: 'Población', value: pop.toLocaleString('es-MX'), hint: 'Suma POBTOT' },
      { label: 'Part. 2024 media', value: `${partAvg.toFixed(1)}%`, hint: 'Ponderada por colonias' },
    ]);
    queueMicrotask(() => this.render(rows));
  }

  exportPdf() {
    this.report.downloadInforme(this.filtered().length ? this.filtered() : this.allPerfiles(), {
      n_colonias: this.stats()?.n_colonias,
      k: this.stats()?.k,
      municipios: [...ZMG_MUNICIPIOS],
    });
  }

  private render(rows: Perfil[]) {
    if (!rows.length) {
      [this.barHost, this.pieHost, this.partHost, this.radarHost].forEach((h) => {
        try { clearHost(h().nativeElement); } catch { /* */ }
      });
      return;
    }
    drawBar(this.barHost().nativeElement, rows.map((r) => ({ nombre: r.nombre, color: r.color, value: r.n_colonias })));
    drawPie(this.pieHost().nativeElement, rows.map((r) => ({ nombre: r.nombre, color: r.color, value: r.n_colonias })));
    drawBar(
      this.partHost().nativeElement,
      rows.map((r) => ({ nombre: r.nombre, color: r.color, value: Number(r.metricas['tasa_2024']) })),
      { pct: true },
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
