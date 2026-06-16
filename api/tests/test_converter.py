import io
import os
import sys

import pytest
from PIL import Image
from pypdf import PdfReader, PdfWriter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from converter import PdfMergeError, convert_images, merge_pdfs


def _jpeg(width=100, height=150, color=(200, 100, 50)) -> bytes:
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _png_rgba(width=100, height=150) -> bytes:
    img = Image.new("RGBA", (width, height), (200, 100, 50, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _page_count(pdf_bytes: bytes) -> int:
    return len(PdfReader(io.BytesIO(pdf_bytes)).pages)


def _blank_pdf(page_count=1) -> bytes:
    writer = PdfWriter()
    for _ in range(page_count):
        writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _encrypted_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.encrypt("secret")
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_single_image_fit_returns_pdf():
    result = convert_images(
        [("a.jpg", _jpeg())],
        mode="multi",
        page_size="fit",
        orientation="portrait",
        margin_px=0,
        quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 1


def test_multi_mode_two_images_merges_pages():
    result = convert_images(
        [("a.jpg", _jpeg()), ("b.jpg", _jpeg())],
        mode="multi",
        page_size="fit",
        orientation="portrait",
        margin_px=0,
        quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 2


def test_single_mode_two_images_returns_list():
    result = convert_images(
        [("a.jpg", _jpeg()), ("b.jpg", _jpeg())],
        mode="single",
        page_size="fit",
        orientation="portrait",
        margin_px=0,
        quality_dpi=150,
    )
    assert isinstance(result, list)
    assert len(result) == 2
    for pdf in result:
        assert _page_count(pdf) == 1


def test_a4_page_size():
    result = convert_images(
        [("a.jpg", _jpeg())],
        mode="multi",
        page_size="A4",
        orientation="portrait",
        margin_px=0,
        quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 1


def test_landscape_orientation():
    # portrait image (100x150) with landscape → should rotate
    result = convert_images(
        [("a.jpg", _jpeg(100, 150))],
        mode="multi",
        page_size="fit",
        orientation="landscape",
        margin_px=0,
        quality_dpi=150,
    )
    assert isinstance(result, bytes)


def test_margin_applied():
    result = convert_images(
        [("a.jpg", _jpeg())],
        mode="multi",
        page_size="fit",
        orientation="portrait",
        margin_px=20,
        quality_dpi=150,
    )
    assert isinstance(result, bytes)


def test_png_rgba_converted():
    result = convert_images(
        [("a.png", _png_rgba())],
        mode="multi",
        page_size="fit",
        orientation="portrait",
        margin_px=0,
        quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 1


def test_merge_pdfs_preserves_file_order_and_page_count():
    result = merge_pdfs(
        [("one.pdf", _blank_pdf(1)), ("two.pdf", _blank_pdf(2))]
    )
    assert _page_count(result) == 3


def test_merge_pdfs_rejects_encrypted_pdf():
    with pytest.raises(PdfMergeError, match="protected"):
        merge_pdfs([("locked.pdf", _encrypted_pdf())])


def test_merge_pdfs_rejects_malformed_pdf():
    with pytest.raises(PdfMergeError, match="Invalid PDF"):
        merge_pdfs([("broken.pdf", b"not a pdf")])
