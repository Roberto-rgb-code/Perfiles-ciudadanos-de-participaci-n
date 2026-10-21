/** Fuentes oficiales y equipo — UI, metadatos e informe PDF */

export const ORG = {
  ine: {
    acronym: 'INE',
    name: 'Instituto Nacional Electoral',
    label: 'INE (Instituto Nacional Electoral)',
  },
  iieg: {
    acronym: 'IIEG',
    name: 'Instituto de Información Estadística y Geográfica del Estado de Jalisco',
    label: 'IIEG (Instituto de Información Estadística y Geográfica del Estado de Jalisco)',
  },
  inegi: {
    acronym: 'INEGI',
    name: 'Instituto Nacional de Estadística y Geografía',
    label: 'INEGI (Instituto Nacional de Estadística y Geografía)',
  },
} as const;

/** Capas / carpetas de data/raw con atribución correcta */
export const DATA_SOURCE_ITEMS = [
  {
    org: ORG.ine,
    folder: 'Cartografia_electoral',
    title: 'Cartografía electoral',
    detail:
      'Secciones y municipios electorales utilizados para transferir la participación a colonia.',
  },
  {
    org: ORG.ine,
    folder: 'electoral',
    title: 'Resultados / participación electoral',
    detail:
      'Indicadores de participación en procesos electorales (diputaciones locales 2018, 2021 y 2024) agregados a colonia.',
  },
  {
    org: ORG.inegi,
    folder: 'Nivel_socioeconomico',
    title: 'Nivel socioeconómico',
    detail: 'Capa AGEB de nivel socioeconómico para Jalisco, asignada a colonia por centroide.',
  },
  {
    org: ORG.iieg,
    folder: 'Sociodemografico',
    title: 'Sociodemográfico por colonia (ISDCOL)',
    detail:
      'Indicadores demográficos y de vivienda a nivel colonia para la ZMG (población, edad, sexo, escolaridad, etc.).',
  },
] as const;

/** Líneas cortas para footer / chips */
export const DATA_SOURCES = [
  `${ORG.ine.label} — cartografía electoral y participación electoral`,
  `${ORG.iieg.label} — sociodemográfico por colonia (ISDCOL)`,
  `${ORG.inegi.label} — nivel socioeconómico AGEB`,
  'Universo espacial: Zona Metropolitana de Guadalajara (ZMG)',
];

export const SOURCES_SHORT =
  'INE (Instituto Nacional Electoral) · IIEG (Instituto de Información Estadística y Geográfica de Jalisco) · INEGI (Instituto Nacional de Estadística y Geografía)';

export const TEAM = [
  'Kevin Roberto Torres Ruiz',
  'Nadine Valeria Montoya Rabago',
  'Guillermo Ruiz Fernández',
];

export const PROJECT_TAGLINE =
  'Hackatón INE · Reto 1 — Perfiles ciudadanos de participación (piloto ZMG)';
