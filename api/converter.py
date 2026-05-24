import io
import zipfile
from pathlib import Path

import img2pdf
from PIL import Image
from pypdf import PdfReader, PdfWriter

MM_PER_INCH = 25.4
PT_PER_MM = 72 / MM_PER_INCH

PAGE_SIZES_MM: dict[str, tuple[float, float]] = {
    "A4": (210.0, 297.0),
    "Letter": (215.9, 279.4),
}


def _to_rgb(img: Image.Image) -> Image.Image:
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        return bg
    return img.convert("RGB")


def _process_image(
    image_bytes: bytes,
    orientation: str,
    margin_px: int,
    page_size: str,
    quality_dpi: int,
) -> bytes:
    img = _to_rgb(Image.open(io.BytesIO(image_bytes)))

    if orientation == "landscape" and img.width <= img.height:
        img = img.rotate(90, expand=True)
    elif orientation == "portrait" and img.width > img.height:
        img = img.rotate(-90, expand=True)

    if margin_px > 0:
        canvas = Image.new(
            "RGB",
            (img.width + 2 * margin_px, img.height + 2 * margin_px),
            (255, 255, 255),
        )
        canvas.paste(img, (margin_px, margin_px))
        img = canvas

    buf = io.BytesIO()

    if page_size == "fit":
        img.save(buf, format="JPEG", quality=95)
        result = img2pdf.convert(buf.getvalue())
        assert result is not None
        return result

    w_mm, h_mm = PAGE_SIZES_MM[page_size]
    if orientation == "landscape":
        w_mm, h_mm = h_mm, w_mm

    page_w_px = int(w_mm / MM_PER_INCH * quality_dpi)
    page_h_px = int(h_mm / MM_PER_INCH * quality_dpi)

    img.thumbnail((page_w_px, page_h_px), Image.Resampling.LANCZOS)

    page_canvas = Image.new("RGB", (page_w_px, page_h_px), (255, 255, 255))
    page_canvas.paste(
        img,
        ((page_w_px - img.width) // 2, (page_h_px - img.height) // 2),
    )
    page_canvas.save(buf, format="JPEG", quality=95)

    layout_fun = img2pdf.get_layout_fun(
        pagesize=(w_mm * PT_PER_MM, h_mm * PT_PER_MM)
    )
    result = img2pdf.convert(buf.getvalue(), layout_fun=layout_fun)
    assert result is not None
    return result


def convert_images(
    image_files: list[tuple[str, bytes]],
    mode: str,
    page_size: str,
    orientation: str,
    margin_px: int,
    quality_dpi: int,
) -> bytes | list[bytes]:
    pdfs = [
        _process_image(data, orientation, margin_px, page_size, quality_dpi)
        for _, data in image_files
    ]

    if mode == "single":
        return pdfs

    if len(pdfs) == 1:
        return pdfs[0]

    writer = PdfWriter()
    for pdf_bytes in pdfs:
        for page in PdfReader(io.BytesIO(pdf_bytes)).pages:
            writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def pdfs_to_zip(filenames: list[str], pdfs: list[bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, pdf_bytes in zip(filenames, pdfs, strict=False):
            zf.writestr(Path(filename).stem + ".pdf", pdf_bytes)
    return buf.getvalue()
