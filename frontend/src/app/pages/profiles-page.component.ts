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
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
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
                Usa el buscador y filtros para localizar perfiles. PDF descarga solo los visibles.
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

        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <label class="md:col-span-2 block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-700">Buscar</span>
            <input class="filter-input" type="search" placeholder="Nombre, descripción, slug…"
              [ngModel]="query()" (ngModelChange)="query.set($event); apply()" />
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-700">NSE mínimo</span>
            <select class="filter-input" [ngModel]="minNse()" (ngModelChange)="minNse.set(+$event); apply()">
              <option [ngValue]="0">Todos</option>
              <option [ngValue]="3">≥ 3</option>
              <option [ngValue]="4">≥ 4</option>
              <option [ngValue]="5">≥ 5</option>
              <option [ngValue]="6">≥ 6</option>
            </select>
          </label>
        </div>
        <p class="mt-2 text-[11px] font-semibold text-brand-700">
          {{ filtered().length }} perfil(es) visibles
        </p>
      </section>

      <div class="mb-4 grid gap-4 lg:grid-cols-2">
        <div class="panel-card p-4">
          <h3 class="mb-1 text-sm font-bold text-brand-900">Peso de cada perfil</h3>
          <div #pieHost></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-1 text-sm font-bold text-brand-900">Comparativo por variable</h3>
          <div #radarHost></div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (p of filtered(); track p.cluster_id) {
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
            </dl>
            <a routerLink="/campanas" [queryParams]="{c: p.cluster_id}"
              class="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
              <app-icon icon="line-md:arrow-right" [size]="16" color="#fff" />
              Ver estrategia
            </a>
          </article>
        } @empty {
          <p class="panel-card p-6 text-sm text-brand-700 md:col-span-2 xl:col-span-3">
            Ningún perfil coincide con la búsqueda / filtros.
          </p>
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
  all = signal<Perfil[]>([]);
  filtered = signal<Perfil[]>([]);
  query = signal('');
  minNse = signal(0);
  meta: any;
  sources = DATA_SOURCES;
  team = TEAM;
  pieHost = viewChild.required<ElementRef<HTMLDivElement>>('pieHost');
  radarHost = viewChild.required<ElementRef<HTMLDivElement>>('radarHost');

  ngOnInit() {
    this.api.perfiles().subscribe((p) => {
      this.meta = p;
      const colored = p.perfiles.map((x, i) => ({ ...x, color: PALETTE[i % PALETTE.length] }));
      this.all.set(colored);
      this.apply();
    });
  }

  ngOnDestroy() {
    try { clearHost(this.pieHost().nativeElement); } catch { /* */ }
    try { clearHost(this.radarHost().nativeElement); } catch { /* */ }
  }

  apply() {
    const q = this.query().trim().toLowerCase();
    const min = this.minNse();
    const rows = this.all().filter((p) => {
      if (Number(p.metricas['nse_prom'] || 0) < min) return false;
      if (!q) return true;
      return `${p.nombre} ${p.descripcion} ${p.slug}`.toLowerCase().includes(q);
    });
    this.filtered.set(rows);
    queueMicrotask(() => this.render(rows));
  }

  exportPdf() {
    this.report.downloadInforme(this.filtered().length ? this.filtered() : this.all(), {
      n_colonias: this.meta?.n_colonias,
      k: this.meta?.k,
      municipios: this.meta?.municipios,
    });
  }

  private render(rows: Perfil[]) {
    if (!rows.length) {
      try { clearHost(this.pieHost().nativeElement); } catch { /* */ }
      try { clearHost(this.radarHost().nativeElement); } catch { /* */ }
      return;
    }
    drawPie(this.pieHost().nativeElement, rows.map((r) => ({ nombre: r.nombre, color: r.color, value: r.n_colonias })));
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
