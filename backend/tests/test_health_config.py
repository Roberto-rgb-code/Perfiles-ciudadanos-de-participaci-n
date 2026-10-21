from app.config import settings
from app.profiles import templates_for_k


def test_zmg_has_core_municipios():
    keys = " ".join(settings.zmg_municipios).lower()
    assert "guadalajara" in keys
    assert "zapopan" in keys


def test_templates_k():
    assert len(templates_for_k(5)) == 5
    assert len(templates_for_k(3)) == 3
