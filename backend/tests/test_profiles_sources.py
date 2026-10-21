from app.profiles import PROFILE_TEMPLATES, templates_for_k


def test_profile_colors_are_brand_purple():
    colors = {t["color"].lower() for t in PROFILE_TEMPLATES}
    assert "#4b1c71" in colors
    assert all(c.startswith("#") and len(c) == 7 for c in colors)


def test_each_template_has_strategy():
    for t in PROFILE_TEMPLATES:
        assert t["slug"]
        assert t["nombre"]
        assert t["estrategia"]["mensaje"]
        assert len(t["estrategia"]["canales"]) >= 1
        assert len(t["estrategia"]["acciones"]) >= 1


def test_templates_for_k_preserves_fields():
    out = templates_for_k(5)
    assert [p["slug"] for p in out] == [p["slug"] for p in PROFILE_TEMPLATES[:5]]
