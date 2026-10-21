import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from './core/icon.component';
import { DATA_SOURCES, SOURCES_SHORT, TEAM } from './core/credits';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="app-shell">
      <header class="topbar">
        <div class="flex items-center gap-3 min-w-0">
          <div class="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
            <app-icon icon="line-md:account" [size]="22" color="#fff" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-[13px] font-bold leading-tight sm:text-sm">Perfiles ciudadanos de participación</p>
            <p class="truncate text-[10px] font-semibold uppercase tracking-wider text-brand-300">
              Hackatón INE · Reto 1 · ZMG
            </p>
          </div>
        </div>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Secciones">
          @for (item of topNav; track item.path) {
            <a class="top-link" [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>

        <div class="w-24 shrink-0" aria-hidden="true"></div>
      </header>

      <div class="workspace">
        <aside class="rail" aria-label="Navegación principal">
          @for (item of nav; track item.path) {
            <a class="rail-item" [routerLink]="item.path" routerLinkActive="active" [title]="item.label">
              <app-icon [icon]="item.icon" [size]="24" animate="float" />
              <span>{{ item.short }}</span>
            </a>
          }
          <div class="mt-auto flex flex-col items-center gap-1 px-1 pb-1 text-[9px] font-bold text-brand-700/70">
            <app-icon icon="line-md:map-marker-alt-twotone" [size]="16" color="#7f4ca5" />
            ZMG
          </div>
        </aside>

        <div class="stage">
          <router-outlet />
        </div>
      </div>

      <footer class="app-footer">
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
export class AppComponent {
  sources = DATA_SOURCES;
  team = TEAM;
  sourcesShort = SOURCES_SHORT;

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
}
