import io
import os
import sys
import zipfile

from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from main import app

client = TestClient(app)


def _jpeg(w=100, h=150) -> bytes:
    img = Image.new("RGB", (w, h), (128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


BASE_FORM = dict(
    mode="multi", page_size="fit", orientation="portrait", margin_px="0", quality="150"
)


def test_convert_multi_single_image_returns_pdf():
    r = client.post(
        "/api/convert",
        data=BASE_FORM,
        files=[("images", ("a.jpg", _jpeg(), "image/jpeg"))],
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_convert_multi_two_images_returns_pdf():
    r = client.post(
        "/api/convert",
        data=BASE_FORM,
        files=[
            ("images", ("a.jpg", _jpeg(), "image/jpeg")),
            ("images", ("b.jpg", _jpeg(), "image/jpeg")),
        ],
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_convert_single_two_images_returns_zip():
    form = {**BASE_FORM, "mode": "single"}
    r = client.post(
        "/api/convert",
        data=form,
        files=[
            ("images", ("a.jpg", _jpeg(), "image/jpeg")),
            ("images", ("b.jpg", _jpeg(), "image/jpeg")),
        ],
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        assert len(zf.namelist()) == 2


def test_convert_single_one_image_returns_pdf():
    form = {**BASE_FORM, "mode": "single"}
    r = client.post(
        "/api/convert",
        data=form,
        files=[("images", ("a.jpg", _jpeg(), "image/jpeg"))],
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"


def test_convert_rejects_unsupported_mime():
    r = client.post(
        "/api/convert",
        data=BASE_FORM,
        files=[("images", ("a.gif", b"GIF89a", "image/gif"))],
    )
    assert r.status_code == 400
    assert "error" in r.json()


def test_convert_rejects_oversized_file():
    big = b"x" * (21 * 1024 * 1024)
    r = client.post(
        "/api/convert",
        data=BASE_FORM,
        files=[("images", ("a.jpg", big, "image/jpeg"))],
    )
    assert r.status_code == 400
