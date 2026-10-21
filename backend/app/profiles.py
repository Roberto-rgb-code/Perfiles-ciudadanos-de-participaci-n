"""Narrativa y estrategias INE por cluster (plantillas editables)."""

from __future__ import annotations

PROFILE_TEMPLATES = [
    {
        "slug": "jovenes-distantes",
        "nombre": "Jóvenes Urbanos Distantes",
        "color": "#4b1c71",
        "descripcion": (
            "Colonias con alta proporción de población joven (18–24), escolaridad media-alta "
            "y participación electoral históricamente baja o en descenso."
        ),
        "estrategia": {
            "mensaje": "Tu voto define la ciudad donde vives y estudias.",
            "canales": ["Redes sociales", "Universidades", "Centros culturales"],
            "tono": "Cercano, visual, corto",
            "acciones": [
                "Campañas digitales geolocalizadas en ZMG",
                "Brigadas en campus y espacios culturales",
                "Recordatorios de fecha y módulo INE cercanos",
            ],
        },
    },
    {
        "slug": "veteranos-leales",
        "nombre": "Veteranos Leales",
        "color": "#7f4ca5",
        "descripcion": (
            "Colonias con mayor peso de adultos mayores, participación sostenida alta "
            "y hábitos estables de acudir a casilla."
        ),
        "estrategia": {
            "mensaje": "Tu experiencia fortalece la democracia — confirma tu casilla.",
            "canales": ["Radio local", "Volanteo puerta a puerta", "Centros de día"],
            "tono": "Respetuoso, claro, presencial",
            "acciones": [
                "Apoyo de traslado el día de la elección",
                "Recordatorios por teléfono / visitas",
                "Material impreso de gran tipografía",
            ],
        },
    },
    {
        "slug": "familias-intermitentes",
        "nombre": "Familias Intermitentes",
        "color": "#b57edc",
        "descripcion": (
            "Perfil familiar de edad media, participación intermedia que sube en presidenciales "
            "y baja en intermedias."
        ),
        "estrategia": {
            "mensaje": "Las elecciones intermedias también deciden tu colonia.",
            "canales": ["WhatsApp comunitarios", "Escuelas", "Tianguis / plazas"],
            "tono": "Práctico, familiar",
            "acciones": [
                "Activación especial en elecciones intermedias",
                "Ferias informativas en plazas",
                "Alianzas con asociaciones de padres",
            ],
        },
    },
    {
        "slug": "periferia-emergente",
        "nombre": "Periferia Emergente",
        "color": "#9d4edd",
        "descripcion": (
            "Colonias de expansión urbana con NSE más bajo, menor escolaridad promedio "
            "y participación irregular."
        ),
        "estrategia": {
            "mensaje": "Participar es exigir servicios y seguridad en tu colonia.",
            "canales": ["Radio comunitaria", "Líderes vecinales", "Mercados"],
            "tono": "Directo, territorial",
            "acciones": [
                "Mesas itinerantes de atención ciudadana",
                "Material bilingüe / pictográfico si aplica",
                "Enlace con autoridades municipales de promoción",
            ],
        },
    },
    {
        "slug": "nucleo-estable",
        "nombre": "Núcleo Metropolitano Estable",
        "color": "#5a189a",
        "descripcion": (
            "Colonias consolidadas con participación media-alta, mix etario equilibrado "
            "y escolaridad promedio sólida."
        ),
        "estrategia": {
            "mensaje": "Mantén el hábito: informa a tu círculo cercano.",
            "canales": ["Correo / SMS", "Mapas de casilla", "Voluntariado"],
            "tono": "Institucional, confiable",
            "acciones": [
                "Programa de embajadores vecinales",
                "Actualización de domicilio y casilla",
                "Difusión de resultados y transparencia",
            ],
        },
    },
]


def templates_for_k(k: int) -> list[dict]:
    return PROFILE_TEMPLATES[: max(1, min(k, len(PROFILE_TEMPLATES)))]
