import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { driver, Driver } from 'driver.js';

const TOUR_KEY = 'pcp_zmg_tour_v1';

@Injectable({ providedIn: 'root' })
export class TourService {
  private router = inject(Router);
  private active?: Driver;

  /** Arranca el tour; si force=false solo la primera visita. */
  async start(force = false) {
    if (!force && localStorage.getItem(TOUR_KEY) === '1') return;

    // El recorrido empieza en el mapa (inicio)
    if (!this.router.url.startsWith('/mapa')) {
      await this.router.navigateByUrl('/mapa');
      await new Promise((r) => setTimeout(r, 450));
    } else {
      await new Promise((r) => setTimeout(r, 200));
    }

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
              'Aquí ves la radiografía de la colonia (al hacer clic), cambias capas temáticas y consultas fuentes / metodología de cada capa.',
            side: 'left',
            align: 'start',
          },
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
