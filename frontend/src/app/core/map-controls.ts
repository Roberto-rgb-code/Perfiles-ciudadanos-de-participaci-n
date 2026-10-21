import maplibregl from 'maplibre-gl';

/**
 * Control vertical: acercar · ubicarme (tiempo real) · alejar
 * Estilo similar a MapaLab / IIEG.
 */
export class ZoomLocateControl implements maplibregl.IControl {
  private container!: HTMLDivElement;
  private map?: maplibregl.Map;
  private watchId: number | null = null;
  private tracking = false;
  private locateBtn!: HTMLButtonElement;

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl map-nav-pill';

    const zoomIn = this.btn('Acercar', '+', () => map.zoomIn({ duration: 300 }));
    this.locateBtn = this.btn('Mi ubicación en tiempo real', '◎', () => this.toggleLocate());
    this.locateBtn.classList.add('map-nav-locate');
    this.locateBtn.innerHTML = locateSvg();
    const zoomOut = this.btn('Alejar', '−', () => map.zoomOut({ duration: 300 }));

    this.container.append(zoomIn, this.locateBtn, zoomOut);
    return this.container;
  }

  onRemove() {
    this.stopWatch();
    this.container.remove();
    this.map = undefined;
  }

  private btn(title: string, fallback: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.textContent = fallback;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return b;
  }

  private toggleLocate() {
    if (!this.map) return;
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    if (this.tracking) {
      this.stopWatch();
      return;
    }
    this.tracking = true;
    this.locateBtn.classList.add('active');
    this.locateBtn.title = 'Detener seguimiento de ubicación';

    const apply = (pos: GeolocationPosition) => {
      if (!this.map) return;
      const { longitude, latitude, accuracy } = pos.coords;
      const lngLat: [number, number] = [longitude, latitude];

      if (!this.map.getSource('user-loc')) {
        this.map.addSource('user-loc', {
          type: 'geojson',
          data: pointFc(lngLat),
        });
        this.map.addLayer({
          id: 'user-loc-accuracy',
          type: 'circle',
          source: 'user-loc',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              Math.max(18, accuracy / 40),
              16,
              Math.max(40, accuracy / 8),
            ],
            'circle-color': '#4b1c71',
            'circle-opacity': 0.12,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#7f4ca5',
            'circle-stroke-opacity': 0.45,
          },
        });
        this.map.addLayer({
          id: 'user-loc-dot',
          type: 'circle',
          source: 'user-loc',
          paint: {
            'circle-radius': 7,
            'circle-color': '#4b1c71',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#fff0ff',
          },
        });
        this.map.flyTo({ center: lngLat, zoom: Math.max(this.map.getZoom(), 13), duration: 900 });
      } else {
        (this.map.getSource('user-loc') as maplibregl.GeoJSONSource).setData(pointFc(lngLat));
      }
    };

    navigator.geolocation.getCurrentPosition(apply, (err) => {
      this.stopWatch();
      alert(err.message || 'No se pudo obtener la ubicación.');
    }, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 });

    this.watchId = navigator.geolocation.watchPosition(apply, () => this.stopWatch(), {
      enableHighAccuracy: true,
      maximumAge: 3_000,
      timeout: 20_000,
    });
  }

  private stopWatch() {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.tracking = false;
    this.locateBtn?.classList.remove('active');
    if (this.locateBtn) this.locateBtn.title = 'Mi ubicación en tiempo real';
    if (!this.map) return;
    if (this.map.getLayer('user-loc-dot')) this.map.removeLayer('user-loc-dot');
    if (this.map.getLayer('user-loc-accuracy')) this.map.removeLayer('user-loc-accuracy');
    if (this.map.getSource('user-loc')) this.map.removeSource('user-loc');
  }
}

/**
 * Escala gráfica + fracción representativa (1 : N)
 */
export class ScaleRatioControl implements maplibregl.IControl {
  private container!: HTMLDivElement;
  private ratioEl!: HTMLDivElement;
  private barEl!: HTMLDivElement;
  private labelEl!: HTMLDivElement;
  private map?: maplibregl.Map;
  private onMove = () => this.update();

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'map-scale-box';
    this.ratioEl = document.createElement('div');
    this.ratioEl.className = 'map-scale-ratio';
    this.barEl = document.createElement('div');
    this.barEl.className = 'map-scale-bar';
    this.labelEl = document.createElement('div');
    this.labelEl.className = 'map-scale-labels';
    this.container.append(this.ratioEl, this.barEl, this.labelEl);
    map.on('move', this.onMove);
    map.on('zoom', this.onMove);
    setTimeout(() => this.update(), 0);
    return this.container;
  }

  onRemove() {
    this.map?.off('move', this.onMove);
    this.map?.off('zoom', this.onMove);
    this.container.remove();
    this.map = undefined;
  }

  private update() {
    if (!this.map) return;
    const maxWidth = 120;
    const y = this.map.getContainer().clientHeight / 2;
    const left = this.map.unproject([0, y]);
    const right = this.map.unproject([maxWidth, y]);
    const meters = left.distanceTo(right);
    if (!Number.isFinite(meters) || meters <= 0) return;

    // Escala gráfica "bonita"
    const nice = niceDistance(meters);
    const widthPx = Math.max(40, (nice / meters) * maxWidth);
    this.barEl.style.width = `${widthPx}px`;
    this.labelEl.style.width = `${widthPx}px`;

    const mid = nice / 2;
    this.labelEl.innerHTML = `<span>0</span><span>${fmtDist(mid)}</span><span>${fmtDist(nice)}</span>`;

    // Fracción 1 : N  (1 px CSS ≈ device pixel; usamos ancho del contenedor de referencia)
    // metros en maxWidth px → 1 m en pantalla = maxWidth/meters px
    // 1 : (metros reales / metros en pantalla). Asumimos 96 dpi → 1 px ≈ 0.000264583 m
    const metersPerPixel = meters / maxWidth;
    const pxInMeters = 0.000264583;
    const ratio = Math.round(metersPerPixel / pxInMeters);
    this.ratioEl.textContent = `1 : ${ratio.toLocaleString('en-US')}`;
  }
}

function pointFc(lngLat: [number, number]) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: lngLat },
      },
    ],
  };
}

function locateSvg(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="2"/>
    <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function niceDistance(maxMeters: number): number {
  const targets = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000];
  let best = targets[0];
  for (const t of targets) {
    if (t <= maxMeters) best = t;
  }
  return best;
}

function fmtDist(m: number): string {
  if (m >= 1000) return `${m / 1000} km`;
  return `${Math.round(m)} m`;
}
