import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IconComponent } from './core/icon.component';
import { DATA_SOURCES, SOURCES_SHORT, TEAM } from './core/credits';
import { TourService } from './core/tour.service';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="app-shell">
      <header class="topbar">
        <a
          id="tour-brand"
          routerLink="/mapa"
          class="brand-home flex min-w-0 items-center gap-3 no-underline"
          title="Ir al inicio (mapa)"
        >
          <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
            <app-icon icon="line-md:account" [size]="22" color="#fff" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-[13px] font-bold leading-tight text-white sm:text-sm">
              Perfiles ciudadanos de participación
            </p>
            <p class="truncate text-[10px] font-semibold uppercase tracking-wider text-brand-300">
              Hackatón INE · Reto 1 · ZMG · Inicio
            </p>
          </div>
        </a>

        <nav id="tour-nav" class="hidden items-center gap-1 md:flex" aria-label="Secciones">
          @for (item of topNav; track item.path) {
            <a class="top-link" [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>

        <div class="flex shrink-0 items-center gap-2">
          @if (!onMapa()) {
            <a routerLink="/mapa" class="btn-outline-light !py-1.5 !text-[11px]" title="Volver al mapa">
              Inicio
            </a>
          }
          <button
            id="tour-tour-btn"
            type="button"
            class="btn-solid-light !py-1.5 !text-[11px]"
            (click)="startTour()"
            title="Tour guiado"
          >
            Tour
          </button>
        </div>
      </header>

      <div class="workspace">
        <aside id="tour-rail" class="rail" aria-label="Navegación principal">
          @for (item of nav; track item.path) {
            <a class="rail-item" [routerLink]="item.path" routerLinkActive="active" [title]="item.label">
              <app-icon [icon]="item.icon" [size]="24" animate="float" />
              <span>{{ item.short }}</span>
            </a>
          }
          <a
            routerLink="/mapa"
            class="mt-auto flex flex-col items-center gap-1 px-1 pb-1 text-[9px] font-bold text-brand-700/70 no-underline"
            title="Inicio · Mapa ZMG"
          >
            <app-icon icon="line-md:map-marker-alt-twotone" [size]="16" color="#7f4ca5" />
            Inicio
          </a>
        </aside>

        <div class="stage">
          <router-outlet />
        </div>
      </div>

      <footer id="tour-footer" class="app-footer">
        <div class="footer-sources">
          <span class="footer-label">Fuentes:</span>
          <span class="footer-text">{{ sourcesShort }}</span>
        </div>
        <div class="footer-team">
          <span class="footer-label">Elaboración:</span>
          <span class="footer-text">{{ team.join(' · ') }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private tour = inject(TourService);

  sources = DATA_SOURCES;
  team = TEAM;
  sourcesShort = SOURCES_SHORT;
  onMapa = signal(true);

  topNav = [
    { path: '/mapa', label: 'Mapa' },
    { path: '/perfiles', label: 'Perfiles' },
    { path: '/stats', label: 'Estadísticas' },
    { path: '/campanas', label: 'Estrategias' },
    { path: '/metodologia', label: 'Metodología' },
  ];

  nav = [
    { path: '/mapa', short: 'Mapa', label: 'Mapa geoespacial', icon: 'line-md:map-marker-loop' },
    { path: '/perfiles', short: 'Perfiles', label: 'Perfiles ciudadanos', icon: 'line-md:account' },
    { path: '/stats', short: 'Stats', label: 'Estadísticas', icon: 'line-md:speedometer-loop' },
    { path: '/campanas', short: 'INE', label: 'Estrategias INE', icon: 'line-md:bell-alert-twotone-loop' },
    { path: '/metodologia', short: 'Método', label: 'Metodología', icon: 'line-md:document-list' },
  ];

  ngOnInit() {
    this.onMapa.set(this.router.url.startsWith('/mapa'));

    // Historial: el “atrás” del navegador regresa al mapa (inicio)
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const url = (e as NavigationEnd).urlAfterRedirects;
      this.onMapa.set(url.startsWith('/mapa'));
      if (!url.startsWith('/mapa')) {
        try {
          history.pushState({ pcpHome: true }, '', url);
        } catch { /* */ }
      }
    });

    // Tour automático la primera vez
    setTimeout(() => void this.tour.start(false), 900);
  }

  /** Regresar del navegador → siempre al mapa */
  @HostListener('window:popstate')
  onBrowserBack() {
    if (!this.router.url.startsWith('/mapa')) {
      void this.router.navigateByUrl('/mapa');
    }
  }

  startTour() {
    this.tour.resetAndStart();
  }
}
