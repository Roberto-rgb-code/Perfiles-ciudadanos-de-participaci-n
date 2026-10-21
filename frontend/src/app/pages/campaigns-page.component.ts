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
  imports: [CommonModule, FormsModule, IconComponent],
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
                Una estrategia por perfil K-Means (no por colonia): todas las colonias del mismo perfil heredan
                mensaje, canales y acciones. Busca por canal, tono o mensaje; el PDF incluye solo las filtradas.
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
            <input class="filter-input" type="search"
              placeholder="Perfil, canal, tono, acción…"
              [ngModel]="query()" (ngModelChange)="query.set($event); apply()" />
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-700">Canal</span>
            <select class="filter-input" [ngModel]="canal()" (ngModelChange)="canal.set($event); apply()">
              <option value="">Todos los canales</option>
              @for (c of canalOptions(); track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </label>
        </div>
        <p class="mt-2 text-[11px] font-semibold text-brand-700">{{ filtered().length }} estrategia(s) visibles</p>
      </section>

      <div class="mb-4 grid gap-4 lg:grid-cols-2">
        <div class="panel-card p-4">
          <h3 class="mb-1 text-sm font-bold text-brand-900">Alcance territorial</h3>
          <div #barHost></div>
        </div>
        <div class="panel-card p-4">
          <h3 class="mb-1 text-sm font-bold text-brand-900">Población por perfil</h3>
          <div #pieHost></div>
        </div>
      </div>

      <div class="space-y-4">
        @for (p of filtered(); track p.cluster_id) {
          <article class="panel-card p-5"
            [class.ring-2]="highlight() === p.cluster_id"
            [style.--tw-ring-color]="p.color">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" [style.color]="p.color">
                  <app-icon icon="line-md:target" [size]="14" [color]="p.color" />
                  Perfil {{ p.cluster_id }} · {{ p.n_colonias }} colonias
                </p>
                <h3 class="mt-1 text-xl font-bold text-brand-900">{{ p.nombre }}</h3>
              </div>
              <p class="max-w-md rounded-2xl bg-brand-50 px-4 py-3 text-sm italic text-brand-900">
                “{{ p.estrategia.mensaje }}”
              </p>
            </div>
            <div class="mt-5 grid gap-3 md:grid-cols-3">
              <div class="rounded-2xl bg-brand-50/80 p-3">
                <h4 class="mb-2 text-xs font-bold uppercase text-brand-700">Canales</h4>
                <ul class="space-y-1.5 text-sm">
                  @for (c of p.estrategia.canales; track c) {
                    <li class="flex items-start gap-2">
                      <app-icon icon="line-md:confirm" [size]="14" color="#4b1c71" />
                      <span>{{ c }}</span>
                    </li>
                  }
                </ul>
              </div>
              <div class="rounded-2xl bg-brand-50/80 p-3">
                <h4 class="mb-2 text-xs font-bold uppercase text-brand-700">Tono</h4>
                <p class="text-sm">{{ p.estrategia.tono }}</p>
              </div>
              <div class="rounded-2xl bg-brand-50/80 p-3">
                <h4 class="mb-2 text-xs font-bold uppercase text-brand-700">Acciones</h4>
                <ul class="space-y-1.5 text-sm">
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
        } @empty {
          <p class="panel-card p-6 text-sm text-brand-700">Ninguna estrategia coincide con los filtros.</p>
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
  all = signal<Perfil[]>([]);
  filtered = signal<Perfil[]>([]);
  canalOptions = signal<string[]>([]);
  query = signal('');
  canal = signal('');
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
      this.all.set(colored);
      const canales = new Set<string>();
      colored.forEach((x) => x.estrategia?.canales?.forEach((ch) => canales.add(ch)));
      this.canalOptions.set([...canales].sort((a, b) => a.localeCompare(b, 'es')));
      this.apply();
    });
  }

  ngOnDestroy() {
    try { clearHost(this.barHost().nativeElement); } catch { /* */ }
    try { clearHost(this.pieHost().nativeElement); } catch { /* */ }
  }

  apply() {
    const q = this.query().trim().toLowerCase();
    const canal = this.canal();
    const rows = this.all().filter((p) => {
      if (canal && !(p.estrategia?.canales || []).includes(canal)) return false;
      if (!q) return true;
      const blob = [
        p.nombre,
        p.descripcion,
        p.estrategia?.mensaje,
        p.estrategia?.tono,
        ...(p.estrategia?.canales || []),
        ...(p.estrategia?.acciones || []),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
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
      try { clearHost(this.barHost().nativeElement); } catch { /* */ }
      try { clearHost(this.pieHost().nativeElement); } catch { /* */ }
      return;
    }
    drawBar(this.barHost().nativeElement, rows.map((r) => ({ nombre: r.nombre, color: r.color, value: r.n_colonias })), { height: 260 });
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
