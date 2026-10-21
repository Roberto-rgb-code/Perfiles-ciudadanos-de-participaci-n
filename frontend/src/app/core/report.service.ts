import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DATA_SOURCES, PROJECT_TAGLINE, TEAM } from './credits';
import { Perfil } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  /** Genera y descarga un PDF real (.pdf), sin HTML intermedio. */
  downloadInforme(perfiles: Perfil[], meta?: { n_colonias?: number; k?: number; municipios?: string[] }) {
    if (!perfiles?.length) {
      alert('Aún no hay perfiles para exportar. Espera a que cargue la API.');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 14;
    const pageW = doc.internal.pageSize.getWidth();
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(75, 28, 113);
    doc.text('Perfiles ciudadanos de participación', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(127, 76, 165);
    const tag = doc.splitTextToSize(PROJECT_TAGLINE, pageW - margin * 2);
    doc.text(tag, margin, y);
    y += tag.length * 5 + 4;

    const nCol = meta?.n_colonias ?? perfiles.reduce((a, p) => a + (p.n_colonias || 0), 0);
    doc.setTextColor(75, 28, 113);
    doc.setFontSize(10);
    doc.text(`Colonias: ${nCol}  ·  k=${meta?.k ?? perfiles.length}  ·  Universo: ZMG Jalisco`, margin, y);
    y += 6;
    if (meta?.municipios?.length) {
      const munLine = doc.splitTextToSize(`Municipios: ${meta.municipios.join(', ')}`, pageW - margin * 2);
      doc.setFontSize(9);
      doc.setTextColor(127, 76, 165);
      doc.text(munLine, margin, y);
      y += munLine.length * 4 + 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(75, 28, 113);
    doc.text('1. Resumen de perfiles (K-Means)', margin, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Perfil', 'Colonias', '% univ.', 'Part. 2024', '% joven', 'Escolaridad', 'NSE']],
      body: perfiles.map((p) => [
        p.nombre,
        String(p.n_colonias),
        `${p.pct_universo}%`,
        `${p.metricas?.['tasa_2024'] ?? '—'}%`,
        `${p.metricas?.['pct_joven_prom'] ?? '—'}%`,
        String(p.metricas?.['escolaridad_prom'] ?? '—'),
        String(p.metricas?.['nse_prom'] ?? '—'),
      ]),
      styles: { font: 'helvetica', fontSize: 8, textColor: [75, 28, 113] },
      headStyles: { fillColor: [75, 28, 113], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 240, 255] },
      margin: { left: margin, right: margin },
    });

    y = ((doc as any).lastAutoTable?.finalY || y) + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. Estrategias diferenciadas para el INE', margin, y);
    y += 7;

    for (const p of perfiles) {
      if (y > 250) {
        doc.addPage();
        y = 16;
      }
      doc.setFillColor(255, 240, 255);
      doc.roundedRect(margin, y - 3, pageW - margin * 2, 4, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(75, 28, 113);
      doc.text(p.nombre, margin, y + 2);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 58, 122);
      const desc = doc.splitTextToSize(p.descripcion || '', pageW - margin * 2);
      doc.text(desc, margin, y);
      y += desc.length * 4 + 2;

      doc.setFont('helvetica', 'italic');
      const msg = doc.splitTextToSize(`“${p.estrategia?.mensaje || ''}”`, pageW - margin * 2);
      doc.text(msg, margin, y);
      y += msg.length * 4 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 28, 113);
      const canales = `Canales: ${(p.estrategia?.canales || []).join(' · ')}`;
      const tono = `Tono: ${p.estrategia?.tono || '—'}`;
      const acc = `Acciones: ${(p.estrategia?.acciones || []).join('; ')}`;
      for (const line of [canales, tono, acc]) {
        const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
        if (y + wrapped.length * 4 > 280) {
          doc.addPage();
          y = 16;
        }
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4 + 2;
      }
      y += 4;
    }

    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('3. Método', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const metodo = doc.splitTextToSize(
      'Se segmentaron colonias de la ZMG con K-Means sobre variables agregadas: estructura etaria, sexo, escolaridad, nivel socioeconómico y tasas de participación 2018–2024. Fuentes: INE (electoral), IIEG (sociodemográfico) e INEGI (nivel socioeconómico). Sin datos personales identificables.',
      pageW - margin * 2,
    );
    doc.text(metodo, margin, y);
    y += metodo.length * 4 + 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Fuentes:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    for (const s of DATA_SOURCES) {
      const lines = doc.splitTextToSize(`• ${s}`, pageW - margin * 2);
      if (y + lines.length * 3.5 > 285) {
        doc.addPage();
        y = 16;
      }
      doc.text(lines, margin, y);
      y += lines.length * 3.5;
    }
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Elaboración:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(TEAM.join(' · '), margin, y);

    const nPages = doc.getNumberOfPages();
    for (let i = 1; i <= nPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(127, 76, 165);
      doc.text(`Pág. ${i}/${nPages}`, pageW - margin, 290, { align: 'right' });
    }

    doc.save('informe-perfiles-ciudadanos-participacion-zmg.pdf');
  }
}
