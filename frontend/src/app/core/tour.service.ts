import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { driver, DriveStep, Driver } from 'driver.js';
import { LAYERS } from './layer-meta';
import { MapTourHooks } from './map-tour-hooks';

const TOUR_KEY = 'pcp_zmg_tour_v2';

@Injectable({ providedIn: 'root' })
export class TourService {
  private router = inject(Router);
  private mapHooks = inject(MapTourHooks);
  private active?: Driver;

  /** Arranca el tour; si force=false solo la primera visita. */
  async start(force = false) {
    if (!force && localStorage.getItem(TOUR_KEY) === '1') return;

    if (!this.router.url.startsWith('/mapa')) {
      await this.router.navigateByUrl('/mapa');
      await new Promise((r) => setTimeout(r, 500));
    } else {
      await new Promise((r) => setTimeout(r, 200));
    }

    // Panel abierto en Colonia antes de highlight
    this.mapHooks.ensurePanel('colonia');
    await new Promise((r) => setTimeout(r, 120));

    const layerSteps: DriveStep[] = LAYERS.map((L) => ({
      element: () => {
        this.mapHooks.ensurePanel('capas');
        this.mapHooks.setLayer(L.id);
        queueScrollIntoView(`#tour-layer-${L.id}`);
        return document.querySelector(`#tour-layer-${L.id}`) as Element;
      },
      popover: {
        title: `Capa · ${L.label}`,
        description: `${L.description} Fuente: ${L.source}.`,
        side: 'left',
        align: 'start',
      },
    }));

    this.active?.destroy();
    this.active = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(75, 28, 113, 0.55)',
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: 'pcp-driver-popover',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Entendido',
      progressText: '{{current}} de {{total}}',
      onDestroyed: () => localStorage.setItem(TOUR_KEY, '1'),
      steps: [
        {
          element: '#tour-brand',
          popover: {
            title: 'Inicio — Perfiles ciudadanos de participación',
            description:
              'Este es el inicio del sistema. En cualquier momento puedes volver aquí (mapa) con el logo, el botón Inicio o la tecla / gesto de regresar del navegador.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-nav',
          popover: {
            title: 'Navegación principal',
            description:
              'Mapa, Perfiles, Estadísticas, Estrategias INE y Metodología. Todo el análisis del Reto 1 está a un clic.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-tour-btn',
          popover: {
            title: 'Tour guiado',
            description: 'Puedes repetir esta guía cuando quieras con el botón «Tour».',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '#tour-rail',
          popover: {
            title: 'Accesos rápidos',
            description: 'Barra lateral con los mismos módulos, pensada para uso continuo durante la demo.',
            side: 'right',
            align: 'center',
          },
        },
        {
          element: '#tour-map-panel',
          popover: {
            title: 'Panel del mapa',
            description:
              'Radiografía de la colonia (clic en el mapa), capas temáticas e info/fuentes. La estrategia INE es por perfil K-Means: todas las colonias del mismo perfil comparten esa estrategia.',
            side: 'left',
            align: 'start',
          },
          onHighlightStarted: () => this.mapHooks.ensurePanel('colonia'),
        },
        {
          element: '#tour-tab-colonia',
          popover: {
            title: 'Pestaña Colonia',
            description:
              'Al seleccionar un polígono ves variables CCPC y el perfil asignado. El botón de estrategia abre la campaña de ese perfil (no una estrategia distinta por cada colonia).',
            side: 'left',
            align: 'start',
          },
          onHighlightStarted: () => this.mapHooks.ensurePanel('colonia'),
        },
        {
          element: '#tour-tab-capas',
          popover: {
            title: 'Pestaña Capas',
            description:
              'Aquí están todas las capas temáticas. El tour las recorre una por una y las activa en el mapa.',
            side: 'left',
            align: 'start',
          },
          onHighlightStarted: () => this.mapHooks.ensurePanel('capas'),
        },
        {
          element: '#tour-layers-list',
          popover: {
            title: 'Lista de capas',
            description:
              'Agrupadas por Segmentación, NSE, Participación y Sociodemográfico. Siguiente: cada capa con su leyenda en el mapa.',
            side: 'left',
            align: 'start',
          },
          onHighlightStarted: () => this.mapHooks.ensurePanel('capas'),
        },
        ...layerSteps,
        {
          element: '#tour-tab-info',
          popover: {
            title: 'Pestaña Info',
            description: 'Descripción, fuente, metodología y referencia cartográfica de la capa activa.',
            side: 'left',
            align: 'start',
          },
          onHighlightStarted: () => this.mapHooks.ensurePanel('info'),
        },
        {
          element: '#tour-download',
          popover: {
            title: 'Informe PDF',
            description:
              'Descarga un PDF real con perfiles, métricas y estrategias — útil para entregar a jueces del hackatón.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '#tour-footer',
          popover: {
            title: 'Fuentes y elaboración',
            description:
              'INE (electoral), IIEG (sociodemográfico) e INEGI (nivel socioeconómico), con el equipo elaborador.',
            side: 'top',
            align: 'center',
          },
        },
      ],
    });

    this.active.drive();
  }

  resetAndStart() {
    localStorage.removeItem(TOUR_KEY);
    void this.start(true);
  }
}

function queueScrollIntoView(sel: string) {
  requestAnimationFrame(() => {
    document.querySelector(sel)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
