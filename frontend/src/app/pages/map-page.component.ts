import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import maplibregl from 'maplibre-gl';
import { ApiService, Perfil } from '../core/api.service';
import { IconComponent } from '../core/icon.component';
import { ReportService } from '../core/report.service';
import { CONT_COLORS, LAYERS, LayerDef } from '../core/layer-meta';
import { TEAM } from '../core/credits';
import { ScaleRatioControl, ZoomLocateControl } from '../core/map-controls';
import { MapTourHooks } from '../core/map-tour-hooks';

type PanelTab = 'colonia' | 'capas' | 'info';

@Component({
  selector: 'app-map-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="absolute inset-0">
      <div id="maplibre-root" class="absolute inset-0"></div>
    </div>

    <!-- A la izquierda del panel cuando está abierto (evita encimarse) -->
    <div
      id="tour-download"
      class="pointer-events-none absolute top-4 z-20 flex gap-2"
      [style.right.px]="panelOpen() ? 400 : 16"
    >
      <button type="button" class="btn-maplab pointer-events-auto" (click)="exportPdf()">
        <app-icon icon="line-md:download-loop" [size]="18" color="#fff" />
        Descargar visualización
      </button>
      @if (!panelOpen()) {
        <button type="button" class="btn-maplab-ghost pointer-events-auto" (click)="openPanel('colonia')" title="Abrir panel">
          <app-icon icon="line-md:clipboard-list" [size]="20" color="#4b1c71" />
        </button>
      }
    </div>

    @if (panelOpen()) {
      <aside id="tour-map-panel" class="maplab-panel absolute bottom-3 right-3 top-3 z-10 flex w-[min(100%,370px)] flex-col overflow-hidden">
        <!-- Header compacto -->
        <div class="shrink-0 border-b border-brand-300/40 px-3 pt-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-[11px] font-bold uppercase tracking-wider text-brand-700">Mapa · ZMG</p>
              <p class="truncate text-sm font-bold text-brand-900">{{ active().label }}</p>
            </div>
            <button type="button" class="icon-ghost" (click)="panelOpen.set(false)" aria-label="Cerrar">
              <app-icon icon="line-md:close" [size]="20" color="#4b1c71" />
            </button>
          </div>

          <div class="mb-2">
            <label class="flex flex-col gap-0.5">
              <span class="flex justify-between text-[10px] font-bold text-brand-700">
                Opacidad <span class="tabular-nums">{{ opacity() }}%</span>
              </span>
              <input class="opacity-range" type="range" min="15" max="100"
                [ngModel]="opacity()" (ngModelChange)="setOpacity($event)" />
            </label>
          </div>

          <!-- Tabs -->
          <div class="panel-tabs" role="tablist">
            <button id="tour-tab-colonia" type="button" role="tab" class="panel-tab" [class.active]="tab() === 'colonia'" (click)="tab.set('colonia')">
              <app-icon icon="line-md:home-twotone-alt" [size]="14" [color]="tab() === 'colonia' ? '#4b1c71' : '#7f4ca5'" />
              Colonia
              @if (selected()) {
                <span class="tab-dot"></span>
              }
            </button>
            <button id="tour-tab-capas" type="button" role="tab" class="panel-tab" [class.active]="tab() === 'capas'" (click)="tab.set('capas')">
              <app-icon icon="line-md:layers-3-twotone" [size]="14" [color]="tab() === 'capas' ? '#4b1c71' : '#7f4ca5'" />
              Capas
            </button>
            <button id="tour-tab-info" type="button" role="tab" class="panel-tab" [class.active]="tab() === 'info'" (click)="tab.set('info')">
              <app-icon icon="line-md:document-list" [size]="14" [color]="tab() === 'info' ? '#4b1c71' : '#7f4ca5'" />
              Info
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <!-- TAB COLONIA: radiografía (se mantiene en DOM para el tour) -->
          <div class="flex min-h-full flex-col" [hidden]="tab() !== 'colonia'">
              <div class="border-b border-brand-300/40 bg-gradient-to-br from-brand-50 to-white px-4 pb-3 pt-4">
                <div class="mb-2 flex h-14 items-end justify-center">
                  <app-icon icon="line-md:home-twotone-alt" [size]="48" color="#7f4ca5" animate="float" />
                </div>
                <h2 class="text-center text-base font-bold text-brand-900">Radiografía local</h2>
                <p class="mt-1 text-center text-[11px] text-brand-700">
                  @if (selected()) {
                    Variables CCPC de la colonia seleccionada
                  } @else {
                    Clic en un polígono del mapa para ver el detalle
                  }
                </p>
              </div>

              <div class="flex-1 px-4 py-3">
                @if (selected(); as s) {
                  <div class="mb-3 rounded-2xl bg-brand-50 px-3 py-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-brand-700">Perfil asignado</p>
                        <p class="mt-0.5 text-sm font-bold" [style.color]="s.color">{{ s.perfil }}</p>
                        <p class="text-[11px] text-brand-700/80">{{ s.municipio }} · {{ s.colonia }}</p>
                      </div>
                      <button type="button" class="icon-ghost shrink-0" (click)="clearSelection()" title="Limpiar selección">
                        <app-icon icon="line-md:close-circle" [size]="18" color="#7f4ca5" />
                      </button>
                    </div>
                    <p class="mt-2 rounded-xl bg-white/80 px-2 py-1.5 text-[11px] font-semibold text-brand-900">
                      En capa actual: <span class="text-brand-700">{{ active().label }}</span> →
                      <span [style.color]="s.color">{{ s.layerValue }}</span>
                    </p>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="rounded-2xl bg-brand-50/80 p-3 text-center">
                      <app-icon icon="line-md:speedometer-loop" [size]="22" color="#4b1c71" />
                      <p class="mt-1 text-lg font-bold tabular-nums text-brand-900">{{ s.tasa_2024 }}%</p>
                      <p class="text-[10px] font-semibold text-brand-700">Part. 2024</p>
                    </div>
                    <div class="rounded-2xl bg-brand-50/80 p-3 text-center">
                      <app-icon icon="line-md:account" [size]="22" color="#7f4ca5" />
                      <p class="mt-1 text-lg font-bold tabular-nums text-brand-900">{{ s.pct_joven }}%</p>
                      <p class="text-[10px] font-semibold text-brand-700">Joven 18–24</p>
                    </div>
                    <div class="rounded-2xl bg-brand-50/80 p-3 text-center">
                      <p class="text-lg font-bold tabular-nums text-brand-900">{{ s.nse }}</p>
                      <p class="text-[10px] font-semibold text-brand-700">Nivel socioeconómico</p>
                    </div>
                    <div class="rounded-2xl bg-brand-50/80 p-3 text-center">
                      <p class="text-lg font-bold tabular-nums text-brand-900">{{ s.lista }}</p>
                      <p class="text-[10px] font-semibold text-brand-700">Pob. 18+</p>
                    </div>
                  </div>

                  <dl class="mt-3 space-y-1.5 text-[12px]">
                    <div class="flex justify-between rounded-xl px-1 py-1"><dt class="text-brand-700">% 60+</dt><dd class="font-bold">{{ s.pct_mayor }}%</dd></div>
                    <div class="flex justify-between rounded-xl px-1 py-1"><dt class="text-brand-700">% mujeres</dt><dd class="font-bold">{{ s.pct_mujer }}%</dd></div>
                    <div class="flex justify-between rounded-xl px-1 py-1"><dt class="text-brand-700">Escolaridad</dt><dd class="font-bold">{{ s.escolaridad }} años</dd></div>
                    <div class="flex justify-between rounded-xl px-1 py-1"><dt class="text-brand-700">Población</dt><dd class="font-bold">{{ s.pob }}</dd></div>
                  </dl>

                  <p class="mt-3 rounded-xl border border-brand-300/50 bg-white px-3 py-2 text-[11px] leading-relaxed text-brand-700">
                    La estrategia INE es <span class="font-bold text-brand-900">por perfil</span> (cluster K-Means),
                    no una distinta por colonia. Todas las colonias con este perfil comparten el mismo mensaje, canales y acciones.
                  </p>
                  <a routerLink="/campanas" [queryParams]="{c: s.cluster_id}"
                    class="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white">
                    <app-icon icon="line-md:bell-alert-twotone-loop" [size]="16" color="#fff" />
                    Estrategia de este perfil
                  </a>
                } @else {
                  <div class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-10 text-center">
                    <app-icon icon="line-md:cursor-default-click" [size]="32" color="#7f4ca5" animate="float" />
                    <p class="text-sm font-semibold text-brand-900">Explora el mapa</p>
                    <p class="text-[11px] leading-relaxed text-brand-700">
                      Selecciona una colonia para ver participación, edad, sexo, escolaridad y nivel socioeconómico.
                    </p>
                    <button type="button" class="mt-2 text-[11px] font-bold text-brand-900 underline" (click)="tab.set('capas')">
                      O cambia de capa temática →
                    </button>
                  </div>

                  <h3 class="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wider text-brand-700">Leyenda rápida</h3>
                  @if (active().kind === 'cat') {
                    <ul class="space-y-1.5">
                      @for (p of perfiles(); track p.cluster_id) {
                        <li class="flex items-center gap-2 text-[12px]">
                          <span class="h-3 w-3 rounded-full" [style.background]="p.color"></span>
                          <span class="text-brand-900">{{ p.nombre }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <div class="flex h-3 overflow-hidden rounded-full ring-1 ring-brand-300/50">
                      @for (c of contColors; track c) {
                        <span class="flex-1" [style.background]="c"></span>
                      }
                    </div>
                    <div class="mt-1 flex justify-between text-[10px] font-semibold text-brand-700">
                      <span>Bajo</span><span>Alto</span>
                    </div>
                  }
                }
              </div>
          </div>

          <!-- TAB CAPAS (siempre en DOM para que el tour pueda resaltar cada capa) -->
          <div class="px-3 py-3" [hidden]="tab() !== 'capas'">
              <div class="mb-3 grid grid-cols-2 gap-2">
                @for (c of layerCards(); track c.label) {
                  <div class="stat-tile">
                    <p class="stat-num">{{ c.value }}</p>
                    <p class="stat-lbl">{{ c.label }}</p>
                  </div>
                }
              </div>

              <div class="rounded-2xl border border-brand-300/50">
                <div class="flex items-center justify-between px-3 py-2.5">
                  <p class="flex items-center gap-1.5 text-sm font-bold text-brand-900">
                    <app-icon icon="line-md:layers-3-twotone" [size]="18" color="#4b1c71" />
                    Capas activas
                  </p>
                  <label class="flex items-center gap-1.5 text-[10px] font-bold text-brand-700">
                    <input type="checkbox" class="accent-brand-900" [checked]="layerVisible()" (change)="toggleVisible()" />
                    Visible
                  </label>
                </div>
                <div id="tour-layers-list" class="max-h-[min(50vh,380px)] overflow-y-auto border-t border-brand-300/40 px-1 py-1">
                  @for (g of layerGroups; track g) {
                    <p class="px-2 pb-0.5 pt-2 text-[9px] font-extrabold uppercase tracking-wide text-brand-700/70">{{ g }}</p>
                    @for (L of layersByGroup(g); track L.id) {
                      <button type="button" class="layer-row" [id]="'tour-layer-' + L.id" [class.active]="activeLayer() === L.id" (click)="setLayer(L.id)">
                        <span class="layer-dot" [style.background]="activeLayer() === L.id ? '#4b1c71' : '#dbb6ee'"></span>
                        <span class="min-w-0 flex-1 truncate text-left">{{ L.label }}</span>
                      </button>
                      @if (activeLayer() === L.id) {
                        <div class="mx-2 mb-2 rounded-xl bg-brand-50 px-3 py-2">
                          <p class="mb-1.5 text-[10px] font-bold uppercase text-brand-700">Leyenda</p>
                          @if (L.kind === 'cat') {
                            <ul class="space-y-1">
                              @for (p of perfiles(); track p.cluster_id) {
                                <li class="flex items-center gap-2 text-[11px]">
                                  <span class="h-2.5 w-2.5 rounded-full" [style.background]="p.color"></span>
                                  {{ p.nombre }}
                                </li>
                              }
                            </ul>
                          } @else {
                            <div class="flex h-2.5 overflow-hidden rounded-full">
                              @for (c of contColors; track c) {
                                <span class="flex-1" [style.background]="c"></span>
                              }
                            </div>
                            <div class="mt-1 flex justify-between text-[9px] font-semibold text-brand-700">
                              @for (lab of legendEnds(L); track lab) { <span>{{ lab }}</span> }
                            </div>
                          }
                        </div>
                      }
                    }
                  }
                </div>
              </div>
          </div>

          <!-- TAB INFO -->
          <div class="px-4 py-3" [hidden]="tab() !== 'info'">
              <section class="meta-block">
                <h3>Descripción</h3>
                <p>{{ active().description }}</p>
                <div class="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p class="font-bold text-brand-900">Frecuencia</p>
                    <p class="text-brand-700">{{ active().frequency }}</p>
                  </div>
                  <div>
                    <p class="font-bold text-brand-900">Actualización</p>
                    <p class="text-brand-700">{{ active().lastUpdate }}</p>
                  </div>
                </div>
              </section>
              <section class="meta-block">
                <h3>Fuente</h3>
                <p class="font-bold text-brand-900">{{ active().source }}</p>
                <p class="mt-1">{{ active().sourceDetail }}</p>
              </section>
              <section class="meta-block">
                <h3>Metodología de la capa</h3>
                <p>{{ active().methodology }}</p>
                <a routerLink="/metodologia" class="mt-2 inline-flex text-[11px] font-bold text-brand-900 underline">
                  Ver metodología completa del proyecto →
                </a>
              </section>
              <section class="meta-block">
                <h3>Referencia cartográfica</h3>
                <p>{{ active().cartoRef }}</p>
              </section>
              <section class="meta-block !border-0">
                <h3>Metadato</h3>
                <p>
                  Universo ZMG · {{ nColonias() }} colonias · k={{ perfiles().length }}.
                  Elaboración: {{ team.join(', ') }}.
                </p>
              </section>
          </div>
        </div>
      </aside>
    }

    <div class="pointer-events-none absolute bottom-4 left-[72px] z-10">
      <div class="pointer-events-auto panel-card flex items-center gap-2 px-3 py-2">
        <app-icon icon="line-md:map-marker-loop" [size]="18" color="#4b1c71" animate="float" />
        <div>
          <p class="text-xs font-bold text-brand-900">Perfiles ZMG</p>
          <p class="text-[10px] font-semibold text-brand-700">{{ nColonias() }} colonias · Reto 1 INE</p>
        </div>
      </div>
    </div>

    <div
      class="pointer-events-none absolute bottom-5 left-0 right-0 z-10 flex justify-center px-4"
      [style.paddingRight.px]="panelOpen() ? 390 : 16"
    >
      <a routerLink="/campanas" class="fab-brand pointer-events-auto inline-flex items-center gap-2">
        <app-icon icon="line-md:bell-alert-twotone-loop" [size]="18" color="#fff" />
        Ver estrategias INE
      </a>
    </div>
  `,
})
export class MapPageComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private report = inject(ReportService);
  private tourHooks = inject(MapTourHooks);
  private readonly tourApi = {
    ensurePanel: (t: PanelTab) => this.openPanel(t),
    setLayer: (id: string) => this.setLayer(id),
  };

  perfiles = signal<Perfil[]>([]);
  selected = signal<any | null>(null);
  activeLayer = signal('perfiles');
  nColonias = signal(0);
  opacity = signal(82);
  layerVisible = signal(true);
  panelOpen = signal(true);
  tab = signal<PanelTab>('colonia');
  layerCards = signal<{ label: string; value: string }[]>([]);
  team = TEAM;
  contColors = CONT_COLORS;
  layerGroups = [...new Set(LAYERS.map((l) => l.group))];

  active = computed(() => LAYERS.find((l) => l.id === this.activeLayer()) || LAYERS[0]);

  private map?: maplibregl.Map;
  private geo: any;
  private meta: any;
  private nameBy: Record<number, string> = {};
  private colorBy: Record<number, string> = {};
  private readonly palette = ['#4b1c71', '#7f4ca5', '#b57edc', '#9d4edd', '#5a189a'];

  layersByGroup(g: string) {
    return LAYERS.filter((l) => l.group === g);
  }

  legendEnds(L: LayerDef) {
    const labs = L.legendLabels || ['Bajo', '', '', '', 'Alto'];
    return [labs[0], labs[labs.length - 1]];
  }

  openPanel(t: PanelTab) {
    this.panelOpen.set(true);
    this.tab.set(t);
  }

  clearSelection() {
    this.selected.set(null);
  }

  ngOnInit() {
    this.tourHooks.register(this.tourApi);
    this.api.perfiles().subscribe((p) => {
      const colored = p.perfiles.map((x, i) => ({
        ...x,
        color: this.palette[i % this.palette.length],
      }));
      this.perfiles.set(colored);
      this.nColonias.set(p.n_colonias);
      this.meta = p;
      for (const x of colored) {
        this.nameBy[x.cluster_id] = x.nombre;
        this.colorBy[x.cluster_id] = x.color;
      }
      setTimeout(() => this.initMap(), 40);
    });
  }

  ngOnDestroy() {
    this.tourHooks.unregister(this.tourApi);
    this.map?.remove();
  }

  setLayer(id: string) {
    this.activeLayer.set(id);
    this.applyPaint();
    this.recomputeCards();
    // Actualiza valor de capa si hay selección, sin perder radiografía
    const s = this.selected();
    if (s?.raw) {
      const L = this.active();
      this.selected.set({ ...s, layerValue: this.formatProp(L, s.raw[L.prop]) });
    }
  }

  setOpacity(v: number | string) {
    const n = Math.max(15, Math.min(100, Number(v)));
    this.opacity.set(n);
    if (this.map?.getLayer('colonias-fill') && this.layerVisible()) {
      this.map.setPaintProperty('colonias-fill', 'fill-opacity', n / 100);
    }
  }

  toggleVisible() {
    const next = !this.layerVisible();
    this.layerVisible.set(next);
    if (!this.map?.getLayer('colonias-fill')) return;
    this.map.setLayoutProperty('colonias-fill', 'visibility', next ? 'visible' : 'none');
    this.map.setLayoutProperty('colonias-line', 'visibility', next ? 'visible' : 'none');
  }

  exportPdf() {
    this.report.downloadInforme(this.perfiles(), {
      n_colonias: this.meta?.n_colonias,
      k: this.meta?.k,
      municipios: this.meta?.municipios,
    });
  }

  private initMap() {
    const el = document.getElementById('maplibre-root');
    if (!el || this.map) return;

    this.map = new maplibregl.Map({
      container: el,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-103.35, 20.67],
      zoom: 10.2,
      attributionControl: {},
    });
    this.map.addControl(new ZoomLocateControl(), 'bottom-left');
    this.map.addControl(new ScaleRatioControl(), 'bottom-left');

    this.map.on('load', () => {
      this.http.get(this.api.geojsonUrl()).subscribe((geo: any) => {
        if (!this.map) return;
        this.geo = geo;
        this.nColonias.set(geo.features?.length || 0);
        this.map.addSource('colonias', { type: 'geojson', data: geo, tolerance: 0.2 });
        this.map.addLayer({
          id: 'colonias-fill',
          type: 'fill',
          source: 'colonias',
          paint: {
            'fill-color': '#b57edc',
            'fill-opacity': this.opacity() / 100,
            'fill-antialias': true,
          },
        });
        this.map.addLayer({
          id: 'colonias-line',
          type: 'line',
          source: 'colonias',
          paint: { 'line-color': '#4b1c71', 'line-width': 0.35, 'line-opacity': 0.35 },
        });
        this.applyPaint();
        this.recomputeCards();

        this.map.on('click', 'colonias-fill', (e) => {
          const f = e.features?.[0];
          if (!f?.properties) return;
          const p = f.properties as Record<string, any>;
          const cid = Number(p['cluster_id']);
          const L = this.active();
          this.selected.set({
            raw: p,
            cluster_id: cid,
            colonia: p['NOMBRE'],
            municipio: p['MUNS'],
            perfil: this.nameBy[cid] || `Cluster ${cid}`,
            color: this.colorBy[cid],
            tasa_2024: (Number(p['tasa_2024'] || 0) * 100).toFixed(1),
            pct_joven: (Number(p['pct_joven'] || 0) * 100).toFixed(1),
            pct_mayor: (Number(p['pct_mayor'] || 0) * 100).toFixed(1),
            pct_mujer: (Number(p['pct_mujer'] || 0) * 100).toFixed(1),
            escolaridad: Number(p['escolaridad'] || 0).toFixed(1),
            nse: Number(p['nse_score'] || 0).toFixed(1),
            lista: Number(p['P_18YMAS'] || 0).toLocaleString('es-MX'),
            pob: Number(p['POBTOT'] || 0).toLocaleString('es-MX'),
            layerValue: this.formatProp(L, p[L.prop]),
          });
          this.panelOpen.set(true);
          this.tab.set('colonia');
        });
        this.map.on('mouseenter', 'colonias-fill', () => {
          if (this.map) this.map.getCanvas().style.cursor = 'pointer';
        });
        this.map.on('mouseleave', 'colonias-fill', () => {
          if (this.map) this.map.getCanvas().style.cursor = '';
        });

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const feat of geo.features || []) {
          for (const [x, y] of this.flattenCoords(feat.geometry)) {
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
          }
        }
        if (Number.isFinite(minX)) {
          this.map.fitBounds([[minX, minY], [maxX, maxY]], {
            padding: { top: 56, bottom: 72, left: 48, right: 400 },
            duration: 800,
          });
        }
      });
    });
  }

  private formatProp(L: LayerDef, raw: any): string {
    const n = Number(raw);
    if (!Number.isFinite(n)) return '—';
    if (L.kind === 'cat') return this.nameBy[n] || String(n);
    if (L.asPct) return `${(n * 100).toFixed(1)}%`;
    if (n >= 1000) return n.toLocaleString('es-MX', { maximumFractionDigits: 0 });
    return n.toFixed(L.prop.includes('nse') || L.prop === 'escolaridad' ? 1 : 0);
  }

  private recomputeCards() {
    const feats: any[] = this.geo?.features || [];
    const L = this.active();
    if (L.kind === 'cat') {
      const perfiles = this.perfiles();
      const top = [...perfiles].sort((a, b) => b.n_colonias - a.n_colonias)[0];
      this.layerCards.set([
        { label: 'Colonias ZMG', value: String(feats.length || this.nColonias()) },
        { label: 'Perfiles (k)', value: String(perfiles.length) },
        { label: 'Perfil mayor', value: top ? String(top.n_colonias) : '—' },
        { label: '% del mayor', value: top ? `${top.pct_universo}%` : '—' },
      ]);
      return;
    }
    const vals = feats.map((f) => Number(f.properties?.[L.prop])).filter((v) => Number.isFinite(v));
    if (!vals.length) {
      this.layerCards.set([
        { label: 'Colonias', value: String(feats.length) },
        { label: 'Mínimo', value: '—' },
        { label: 'Promedio', value: '—' },
        { label: 'Máximo', value: '—' },
      ]);
      return;
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const fmt = (v: number) => this.formatProp(L, v);
    this.layerCards.set([
      { label: 'Colonias con dato', value: String(vals.length) },
      { label: 'Mínimo', value: fmt(min) },
      { label: 'Promedio', value: fmt(avg) },
      { label: 'Máximo', value: fmt(max) },
    ]);
  }

  private applyPaint() {
    if (!this.map?.getLayer('colonias-fill')) return;
    const L = this.active();
    if (L.kind === 'cat') {
      const matchExpr: any[] = ['match', ['to-number', ['get', 'cluster_id']]];
      for (const p of this.perfiles()) matchExpr.push(p.cluster_id, p.color);
      matchExpr.push('#dbb6ee');
      this.map.setPaintProperty('colonias-fill', 'fill-color', matchExpr);
    } else {
      const stops = L.stops || [0, 0.25, 0.5, 0.75, 1];
      const expr: any[] = ['interpolate', ['linear'], ['to-number', ['get', L.prop]]];
      stops.forEach((s, i) => expr.push(s, CONT_COLORS[Math.min(i, CONT_COLORS.length - 1)]));
      this.map.setPaintProperty('colonias-fill', 'fill-color', expr);
    }
    this.map.setPaintProperty('colonias-fill', 'fill-opacity', this.opacity() / 100);
  }

  private flattenCoords(geom: any): [number, number][] {
    const out: [number, number][] = [];
    const walk = (c: any) => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === 'number' && typeof c[1] === 'number') {
        out.push([c[0], c[1]]);
        return;
      }
      for (const x of c) walk(x);
    };
    walk(geom?.coordinates);
    return out;
  }
}
