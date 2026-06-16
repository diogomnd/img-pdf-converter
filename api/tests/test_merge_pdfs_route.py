import io
import json
import os
import sys
from asyncio import run

from pypdf import PdfReader, PdfWriter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from main import merge_pdfs_route


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


def _page_count(pdf_bytes: bytes) -> int:
    return len(PdfReader(io.BytesIO(pdf_bytes)).pages)


def _upload(
    filename: str,
    data: bytes,
    content_type: str,
):
    class FakeUpload:
        def __init__(self) -> None:
            self.filename = filename
            self.content_type = content_type

        async def read(self) -> bytes:
            return data

    return FakeUpload()


def _json_error(response) -> str:
    return json.loads(response.body)["error"]


def test_merge_pdfs_returns_pdf_with_all_pages():
    response = run(
        merge_pdfs_route(
            [
                _upload("a.pdf", _blank_pdf(1), "application/pdf"),
                _upload("b.pdf", _blank_pdf(2), "application/pdf"),
            ]
        )
    )

    assert response.status_code == 200
    assert response.media_type == "application/pdf"
    assert _page_count(response.body) == 3


def test_merge_pdfs_allows_pdf_extension_when_mime_is_generic():
    response = run(
        merge_pdfs_route(
            [_upload("a.pdf", _blank_pdf(1), "application/octet-stream")]
        )
    )

    assert response.status_code == 200
    assert response.media_type == "application/pdf"


def test_merge_pdfs_rejects_unsupported_file_type():
    response = run(merge_pdfs_route([_upload("a.txt", b"text", "text/plain")]))

    assert response.status_code == 400
    assert _json_error(response)


def test_merge_pdfs_rejects_oversized_file():
    response = run(
        merge_pdfs_route(
            [
                _upload(
                    "big.pdf",
                    b"x" * (21 * 1024 * 1024),
                    "application/pdf",
                )
            ]
        )
    )

    assert response.status_code == 400
    assert "too large" in _json_error(response).lower()


def test_merge_pdfs_rejects_too_many_files():
    files = [
        _upload(f"{index}.pdf", _blank_pdf(1), "application/pdf")
        for index in range(51)
    ]

    response = run(merge_pdfs_route(files))

    assert response.status_code == 400
    assert "too many" in _json_error(response).lower()


def test_merge_pdfs_rejects_malformed_pdf():
    response = run(
        merge_pdfs_route(
            [_upload("broken.pdf", b"not a pdf", "application/pdf")]
        )
    )

    assert response.status_code == 400
    assert "invalid pdf" in _json_error(response).lower()


def test_merge_pdfs_rejects_encrypted_pdf():
    response = run(
        merge_pdfs_route(
            [_upload("locked.pdf", _encrypted_pdf(), "application/pdf")]
        )
    )

    assert response.status_code == 400
    assert "protected" in _json_error(response).lower()
