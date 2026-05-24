import datetime
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

from converter import convert_images, pdfs_to_zip

app = FastAPI()

ALLOWED_MIMES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE = 20 * 1024 * 1024
MAX_IMAGES = 50


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/convert")
async def convert(
    images: Annotated[list[UploadFile], File()],
    mode: Annotated[str, Form()],
    page_size: Annotated[str, Form()],
    orientation: Annotated[str, Form()],
    margin_px: Annotated[int, Form()],
    quality: Annotated[int, Form()],
):
    if len(images) > MAX_IMAGES:
        return JSONResponse(
            status_code=400,
            content={"error": f"Too many images (max {MAX_IMAGES})"},
        )

    image_files: list[tuple[str, bytes]] = []
    for upload in images:
        if upload.content_type not in ALLOWED_MIMES:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unsupported type: {upload.content_type}"},
            )
        data = await upload.read()
        if len(data) > MAX_FILE_SIZE:
            return JSONResponse(
                status_code=400,
                content={"error": f"File too large: {upload.filename}"},
            )
        image_files.append((upload.filename or "image.jpg", data))

    result = convert_images(
        image_files,
        mode=mode,
        page_size=page_size,
        orientation=orientation,
        margin_px=margin_px,
        quality_dpi=quality,
    )

    if mode == "multi":
        pdf_bytes = result if isinstance(result, bytes) else result[0]
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=converted.pdf"},
        )

    pdfs: list[bytes] = result if isinstance(result, list) else [result]
    filenames = [name for name, _ in image_files]

    if len(pdfs) == 1:
        pdf_name = Path(filenames[0]).stem + ".pdf"
        return Response(
            content=pdfs[0],
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={pdf_name}"},
        )

    zip_bytes = pdfs_to_zip(filenames, pdfs)
    ts = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=images-{ts}.zip"},
    )
