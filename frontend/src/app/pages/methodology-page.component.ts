import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../core/icon.component';
import { DATA_SOURCE_ITEMS, ORG, PROJECT_TAGLINE, TEAM } from '../core/credits';

@Component({
  selector: 'app-methodology-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="absolute inset-0 overflow-auto bg-[var(--surface)] p-5 md:p-7">
      <section class="panel-card mb-5 p-5">
        <div class="flex flex-wrap items-start gap-3">
          <div class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50">
            <app-icon icon="line-md:document-list" [size]="28" color="#4b1c71" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="chip mb-1">Transparencia para evaluación</p>
            <h2 class="text-2xl font-bold text-brand-900">Metodología y elaboración</h2>
            <p class="mt-1 max-w-3xl text-sm text-brand-700">{{ tagline }}</p>
          </div>
          <a routerLink="/mapa" class="fab-brand !py-2.5 !text-xs inline-flex items-center gap-2">
            <app-icon icon="line-md:map-marker-loop" [size]="16" color="#fff" />
            Ir al mapa
          </a>
        </div>
      </section>

      <div class="mb-4 grid gap-3 md:grid-cols-3">
        @for (o of orgs; track o.acronym) {
          <div class="panel-card p-4">
            <p class="text-xs font-extrabold uppercase tracking-wider text-brand-700">{{ o.acronym }}</p>
            <p class="mt-1 text-sm font-bold text-brand-900">{{ o.name }}</p>
          </div>
        }
      </div>

      <section class="panel-card mb-4 p-5">
        <h3 class="mb-2 text-base font-bold text-brand-900">1. Objetivo del Reto 1</h3>
        <p class="text-sm leading-relaxed text-brand-700">
          Identificar <b>perfiles de participación ciudadana</b> en la Zona Metropolitana de Guadalajara
          (ZMG) a partir de datos agregados por colonia — sin información personal identificable —
          para proponer estrategias diferenciadas de promoción del voto útiles al INE.
        </p>
      </section>

      <section class="panel-card mb-4 p-5">
        <h3 class="mb-3 text-base font-bold text-brand-900">2. Fuentes de datos (atribución)</h3>
        <div class="space-y-3">
          @for (s of sources; track s.folder) {
            <article class="rounded-2xl border border-brand-300/50 bg-brand-50/50 p-4">
              <p class="text-xs font-extrabold uppercase tracking-wider text-brand-700">{{ s.org.label }}</p>
              <p class="mt-1 text-sm font-bold text-brand-900">{{ s.title }}</p>
              <p class="mt-1 text-[12px] text-brand-700">Carpeta: <code class="rounded bg-white px-1.5 py-0.5">data/raw/{{ s.folder }}</code></p>
              <p class="mt-2 text-sm leading-relaxed text-brand-700">{{ s.detail }}</p>
            </article>
          }
        </div>
      </section>

      <section class="panel-card mb-4 p-5">
        <h3 class="mb-3 text-base font-bold text-brand-900">3. Pipeline de elaboración</h3>
        <ol class="space-y-3 text-sm text-brand-700">
          <li class="rounded-2xl bg-brand-50 p-3">
            <b class="text-brand-900">A. Universo espacial.</b> Se filtran colonias ISDCOL (IIEG) de municipios ZMG,
            incluyendo colonias en límites con municipios compuestos (p. ej. Guadalajara,Zapopan).
          </li>
          <li class="rounded-2xl bg-brand-50 p-3">
            <b class="text-brand-900">B. Sociodemografía.</b> Se calculan proporciones de jóvenes 18–24, adultos 60+,
            mujeres y escolaridad promedio a partir del marco IIEG.
          </li>
          <li class="rounded-2xl bg-brand-50 p-3">
            <b class="text-brand-900">C. Nivel socioeconómico.</b> El NSE AGEB (INEGI) se asigna al centroide de cada
            colonia y se convierte a puntuación ordinal 1–9.
          </li>
          <li class="rounded-2xl bg-brand-50 p-3">
            <b class="text-brand-900">D. Participación electoral.</b> Con cartografía y resultados del INE se estiman
            tasas 2018, 2021 y 2024 por sección y se transfieren a colonia (within / nearest).
          </li>
          <li class="rounded-2xl bg-brand-50 p-3">
            <b class="text-brand-900">E. Segmentación.</b> K-Means (k=5, features estandarizadas) produce clusters;
            se ordenan por participación media y se asigna narrativa + estrategia INE por perfil.
          </li>
          <li class="rounded-2xl bg-brand-50 p-3">
            <b class="text-brand-900">F. Producto web.</b> GeoJSON + API FastAPI + dashboard Angular (mapa, perfiles,
            estadísticas, estrategias e informe PDF) para jueces y operadores.
          </li>
        </ol>
      </section>

      <section class="panel-card mb-4 p-5">
        <h3 class="mb-2 text-base font-bold text-brand-900">4. Variables del clustering</h3>
        <p class="mb-3 text-sm text-brand-700">
          Features usadas en K-Means (todas a nivel colonia, agregadas):
        </p>
        <ul class="grid gap-2 sm:grid-cols-2 text-sm text-brand-900">
          @for (f of features; track f) {
            <li class="rounded-xl bg-brand-50 px-3 py-2 font-semibold">{{ f }}</li>
          }
        </ul>
      </section>

      <section class="panel-card mb-4 p-5">
        <h3 class="mb-2 text-base font-bold text-brand-900">5. Privacidad y límites</h3>
        <p class="text-sm leading-relaxed text-brand-700">
          El sistema trabaja únicamente con <b>datos agregados territoriales</b>. No se almacenan ni visualizan
          datos personales de electores. Las estrategias son orientativas para focalizar comunicación institucional,
          no predicciones individuales de voto.
        </p>
      </section>

      <section class="panel-card p-5 text-[12px] leading-relaxed text-brand-700">
        <p class="font-bold uppercase tracking-wider text-brand-900">Elaboración:</p>
        <p class="mt-1 text-sm font-semibold text-brand-900">{{ team.join(' · ') }}</p>
        <p class="mt-3 font-bold uppercase tracking-wider text-brand-900">Stack técnico</p>
        <p class="mt-1">Python · GeoPandas · scikit-learn · FastAPI · PostGIS · Angular · MapLibre · D3.js · Docker</p>
      </section>
    </div>
  `,
})
export class MethodologyPageComponent {
  tagline = PROJECT_TAGLINE;
  team = TEAM;
  sources = DATA_SOURCE_ITEMS;
  orgs = [ORG.ine, ORG.iieg, ORG.inegi];
  features = [
    '% jóvenes 18–24',
    '% adultos 60+',
    '% mujeres',
    'Escolaridad promedio',
    'Nivel socioeconómico',
    'Participación 2018',
    'Participación 2021',
    'Participación 2024',
    'Delta participación 2018→2024',
  ];
}
