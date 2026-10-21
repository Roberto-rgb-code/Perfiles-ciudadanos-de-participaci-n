import { Injectable } from '@angular/core';
import { DATA_SOURCES, PROJECT_TAGLINE, TEAM } from './credits';
import { Perfil } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  /**
   * Genera informe e intenta imprimir / Guardar como PDF.
   * Usa Blob URL (más fiable que window.open('') + document.write).
   */
  downloadInforme(perfiles: Perfil[], meta?: { n_colonias?: number; k?: number; municipios?: string[] }) {
    if (!perfiles?.length) {
      alert('Aún no hay perfiles para exportar. Espera a que cargue la API.');
      return;
    }

    const html = this.buildHtml(perfiles, meta);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const w = window.open(url, '_blank');
    if (!w) {
      // Popup bloqueado → descarga HTML para abrir e imprimir
      const a = document.createElement('a');
      a.href = url;
      a.download = 'informe-segmentador-ccpc-zmg.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      alert(
        'El navegador bloqueó la ventana emergente.\n' +
          'Se descargó el informe HTML: ábrelo y usa Ctrl+P → Guardar como PDF.',
      );
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    const tryPrint = () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* ignore */
      }
    };

    // load event + respaldo por timeout
    w.addEventListener('load', () => setTimeout(tryPrint, 200));
    setTimeout(tryPrint, 700);
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }

  private buildHtml(
    perfiles: Perfil[],
    meta?: { n_colonias?: number; k?: number; municipios?: string[] },
  ): string {
    const rows = perfiles
      .map(
        (p) => `
      <tr>
        <td><span class="swatch" style="background:${p.color}"></span> ${esc(p.nombre)}</td>
        <td>${p.n_colonias}</td>
        <td>${p.pct_universo}%</td>
        <td>${p.metricas['tasa_2024'] ?? '—'}%</td>
        <td>${p.metricas['pct_joven_prom'] ?? '—'}%</td>
        <td>${p.metricas['escolaridad_prom'] ?? '—'}</td>
        <td>${p.metricas['nse_prom'] ?? '—'}</td>
      </tr>`,
      )
      .join('');

    const strategies = perfiles
      .map(
        (p) => `
      <section class="card">
        <h3><span class="swatch" style="background:${p.color}"></span> ${esc(p.nombre)}</h3>
        <p class="desc">${esc(p.descripcion)}</p>
        <p class="msg">“${esc(p.estrategia?.mensaje)}”</p>
        <p><b>Canales:</b> ${(p.estrategia?.canales || []).map(esc).join(' · ')}</p>
        <p><b>Tono:</b> ${esc(p.estrategia?.tono)}</p>
        <p><b>Acciones:</b></p>
        <ul>${(p.estrategia?.acciones || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      </section>`,
      )
      .join('');

    const munis = (meta?.municipios || []).map(esc).join(', ');
    const nCol =
      meta?.n_colonias ?? perfiles.reduce((a, p) => a + (p.n_colonias || 0), 0);

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Informe Segmentador CCPC — ZMG</title>
<style>
  @page { margin: 16mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #4b1c71; margin: 0; padding: 24px; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 10px; border-bottom: 2px solid #dbb6ee; padding-bottom: 6px; }
  h3 { font-size: 14px; margin: 0 0 8px; }
  .sub { color: #7f4ca5; font-size: 12px; margin-bottom: 18px; }
  .meta { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0 20px; }
  .pill { background: #fff0ff; border-radius: 999px; padding: 6px 12px; font-size: 11px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #dbb6ee; padding: 8px; text-align: left; }
  th { background: #fff0ff; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .card { border: 1px solid #dbb6ee; border-radius: 12px; padding: 14px; margin-bottom: 12px; page-break-inside: avoid; }
  .desc { font-size: 12px; color: #5a3a7a; }
  .msg { font-style: italic; background: #fff0ff; padding: 10px 12px; border-radius: 10px; }
  footer { margin-top: 32px; font-size: 10px; color: #7f4ca5; border-top: 1px solid #dbb6ee; padding-top: 12px; }
  ul { margin: 4px 0 0 18px; padding: 0; font-size: 12px; }
  .print-hint { font-size: 12px; color: #7f4ca5; margin-bottom: 16px; padding: 10px 12px; background: #fff0ff; border-radius: 10px; }
  @media print { .print-hint { display: none; } }
</style>
</head>
<body>
  <p class="print-hint">En el diálogo de impresión elige <b>Guardar como PDF</b> / <b>Microsoft Print to PDF</b>.</p>
  <h1>Segmentador CCPC — Perfiles de participación</h1>
  <p class="sub">${PROJECT_TAGLINE}</p>
  <div class="meta">
    <span class="pill">${nCol} colonias</span>
    <span class="pill">k = ${meta?.k ?? perfiles.length}</span>
    <span class="pill">ZMG Jalisco</span>
  </div>
  <p style="font-size:12px;color:#7f4ca5">Municipios: ${munis || '—'}</p>

  <h2>1. Resumen de perfiles (K-Means)</h2>
  <table>
    <thead>
      <tr>
        <th>Perfil</th><th>Colonias</th><th>% universo</th>
        <th>Part. 2024</th><th>% joven</th><th>Escolaridad</th><th>NSE</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>2. Estrategias diferenciadas para el INE</h2>
  ${strategies}

  <h2>3. Método (lectura para evaluación)</h2>
  <p style="font-size:12px;line-height:1.5">
    Se segmentaron colonias de la ZMG con K-Means sobre variables agregadas:
    estructura etaria, sexo, escolaridad, nivel socioeconómico y tasas de participación
    2018–2024. Fuentes: INE (electoral), IIEG (sociodemográfico) e INEGI (nivel socioeconómico).
    No se utiliza información personal identificable.
  </p>

  <footer>
    <p><b>Fuentes:</b></p>
    <ul>${DATA_SOURCES.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <p style="margin-top:12px"><b>Elaboración:</b></p>
    <p>${TEAM.map(esc).join(' · ')}</p>
  </footer>
</body>
</html>`;
  }
}

function esc(s: string | number | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
