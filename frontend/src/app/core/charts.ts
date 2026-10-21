import * as d3 from 'd3';

const FONT = 'Arial, Helvetica, sans-serif';

export function clearHost(host: HTMLElement) {
  d3.select(host).selectAll('*').remove();
}

export function drawBar(
  host: HTMLElement,
  rows: { nombre: string; color: string; value: number }[],
  opts: { pct?: boolean; height?: number } = {},
) {
  clearHost(host);
  const width = Math.max(host.clientWidth || 420, 320);
  const height = opts.height ?? 280;
  const margin = { top: 16, right: 16, bottom: 78, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(rows.map((r) => r.nombre)).range([0, innerW]).padding(0.28);
  const yMax = d3.max(rows, (r) => r.value) || 1;
  const y = d3
    .scaleLinear()
    .domain([0, opts.pct ? Math.max(yMax, 100) : yMax * 1.12])
    .nice()
    .range([innerH, 0]);

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-28)')
    .style('text-anchor', 'end')
    .style('font-size', '10px')
    .style('font-family', FONT)
    .style('fill', '#4b1c71');
  g.append('g')
    .call(d3.axisLeft(y).ticks(6))
    .selectAll('text')
    .style('font-size', '10px')
    .style('font-family', FONT)
    .style('fill', '#7f4ca5');

  g.selectAll('rect')
    .data(rows)
    .join('rect')
    .attr('x', (d) => x(d.nombre)!)
    .attr('width', x.bandwidth())
    .attr('y', innerH)
    .attr('height', 0)
    .attr('rx', 8)
    .attr('fill', (d) => d.color)
    .transition()
    .duration(700)
    .ease(d3.easeCubicOut)
    .attr('y', (d) => y(d.value))
    .attr('height', (d) => innerH - y(d.value));

  g.selectAll('text.val')
    .data(rows)
    .join('text')
    .attr('class', 'val')
    .attr('x', (d) => x(d.nombre)! + x.bandwidth() / 2)
    .attr('y', (d) => y(d.value) - 6)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '700')
    .style('font-family', FONT)
    .style('fill', '#4b1c71')
    .text((d) => (opts.pct ? `${d.value}%` : `${d.value}`));
}

export function drawPie(
  host: HTMLElement,
  rows: { nombre: string; color: string; value: number }[],
  size = 280,
) {
  clearHost(host);
  const width = Math.max(host.clientWidth || size, size);
  const height = size;
  const radius = Math.min(width, height) / 2 - 8;
  const svg = d3
    .select(host)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  const pie = d3.pie<(typeof rows)[0]>().value((d) => d.value).sort(null);
  const arc = d3.arc<d3.PieArcDatum<(typeof rows)[0]>>().innerRadius(radius * 0.52).outerRadius(radius);
  const arcs = svg.selectAll('path').data(pie(rows)).join('path').attr('fill', (d) => d.data.color).attr('d', arc as any)
    .attr('stroke', '#fff0ff').attr('stroke-width', 2);

  arcs.append('title').text((d) => `${d.data.nombre}: ${d.data.value}`);

  const total = d3.sum(rows, (r) => r.value) || 1;
  svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.2em')
    .style('font-family', FONT)
    .style('font-weight', '700')
    .style('font-size', '18px')
    .style('fill', '#4b1c71')
    .text(String(Math.round(total)));
  svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.2em')
    .style('font-family', FONT)
    .style('font-size', '11px')
    .style('fill', '#7f4ca5')
    .text('colonias');

  const legend = d3.select(host).append('div').attr('class', 'mt-2 grid gap-1 text-[11px]');
  rows.forEach((r) => {
    const pct = ((r.value / total) * 100).toFixed(1);
    legend
      .append('div')
      .attr('class', 'flex items-center gap-2')
      .html(
        `<span style="width:10px;height:10px;border-radius:999px;background:${r.color};display:inline-block"></span>
         <span style="color:#4b1c71;font-family:${FONT}"><b>${esc(r.nombre)}</b> · ${r.value} (${pct}%)</span>`,
      );
  });
}

export type MetricAxis = { key: string; label: string; max: number; unit?: string };

/**
 * Comparación clara por métrica: un panel por variable con barras horizontales por perfil.
 * Sustituye al radar (ilegible con 5 series solapadas).
 */
export function drawMetricFacets(
  host: HTMLElement,
  series: { nombre: string; color: string; values: Record<string, number> }[],
  metrics: MetricAxis[],
) {
  clearHost(host);
  const wrap = d3.select(host).append('div').attr('class', 'grid gap-3 sm:grid-cols-2');

  // Leyenda compacta
  const legend = wrap.append('div').attr('class', 'sm:col-span-2 flex flex-wrap gap-2 mb-1');
  series.forEach((s, i) => {
    legend
      .append('span')
      .attr('class', 'inline-flex items-center gap-1.5 text-[10px] font-bold')
      .style('color', '#4b1c71')
      .style('font-family', FONT)
      .html(
        `<span style="width:9px;height:9px;border-radius:999px;background:${s.color};display:inline-block"></span>P${i} · ${esc(shortName(s.nombre))}`,
      );
  });

  metrics.forEach((m) => {
    const card = wrap.append('div').attr('class', 'rounded-xl bg-[#fff0ff] px-3 py-2.5');
    card
      .append('p')
      .style('font-family', FONT)
      .style('font-size', '11px')
      .style('font-weight', '800')
      .style('color', '#4b1c71')
      .style('margin', '0 0 6px')
      .text(m.label);

    const width = Math.max(card.node()!.clientWidth || 200, 180);
    const rowH = 18;
    const height = series.length * rowH + 8;
    const margin = { left: 28, right: 40, top: 2, bottom: 2 };
    const innerW = width - margin.left - margin.right;
    const svg = card.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([0, m.max || 1]).range([0, innerW]);

    series.forEach((s, i) => {
      const v = Number(s.values[m.key] ?? 0);
      const y = i * rowH;
      g.append('text')
        .attr('x', -6)
        .attr('y', y + 12)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('font-weight', '700')
        .style('font-family', FONT)
        .style('fill', '#7f4ca5')
        .text(`P${i}`);
      g.append('rect')
        .attr('x', 0)
        .attr('y', y + 3)
        .attr('height', 12)
        .attr('rx', 6)
        .attr('fill', s.color)
        .attr('width', 0)
        .transition()
        .duration(600)
        .attr('width', Math.max(2, x(Math.min(v, m.max || v))));
      g.append('text')
        .attr('x', x(Math.min(v, m.max || v)) + 4)
        .attr('y', y + 13)
        .style('font-size', '10px')
        .style('font-weight', '700')
        .style('font-family', FONT)
        .style('fill', '#4b1c71')
        .text(m.unit === '%' ? `${v.toFixed(1)}%` : v.toFixed(m.key === 'esc' || m.key === 'nse' ? 1 : 0));
    });
  });
}

function shortName(n: string) {
  return n.length > 28 ? n.slice(0, 26) + '…' : n;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
