# Image to PDF Converter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local image-to-PDF converter (PNG/JPG → PDF) accessible via browser, running on Docker Compose, usable by all devices on the LAN.

**Architecture:** FastAPI backend handles stateless conversion using Pillow + img2pdf + pypdf. React/Vite frontend serves a 3-step wizard (Upload → Options → Preview/Download). nginx reverse-proxies `/api/*` to FastAPI, eliminating CORS. Two Docker containers — `api` and `frontend` — orchestrated via Docker Compose.

**Tech Stack:** Python 3.12, FastAPI, Pillow, img2pdf, pypdf, React 18, TypeScript, Vite, TailwindCSS, react-dropzone, dnd-kit, react-pdf, nginx, Docker Compose.

---

## File Map

```
image-pdf-converter/
├── docker-compose.yml
├── .gitignore
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py            # FastAPI app + routes
│   ├── converter.py       # image processing + PDF creation logic
│   └── tests/
│       ├── __init__.py
│       ├── test_health.py
│       ├── test_converter.py
│       └── test_convert_route.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── types.ts            # AppState, ImageFile, ConvertOptions
        ├── api.ts              # fetch wrapper for /api/convert
        ├── validation.ts       # client-side file validation
        ├── App.tsx             # root: wizard state machine
        ├── components/
        │   ├── WizardStepper.tsx
        │   ├── Step1Upload.tsx
        │   ├── Step2Options.tsx
        │   ├── Step3Preview.tsx
        │   ├── DropZone.tsx
        │   ├── ImageGrid.tsx
        │   └── ErrorBanner.tsx
        ├── hooks/
        │   └── useAppState.ts
        └── tests/
            ├── api.test.ts
            └── validation.test.ts
```

---

## Task 1: Project skeleton

**Files:**
- Create: `docker-compose.yml`
- Create: `.gitignore`
- Create: `api/Dockerfile`
- Create: `api/requirements.txt`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p api/tests frontend/src
touch api/tests/__init__.py
```

- [ ] **Step 2: Write docker-compose.yml**

```yaml
services:
  api:
    build: ./api
    expose:
      - "8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api
```

- [ ] **Step 3: Write .gitignore**

```
__pycache__/
*.pyc
.pytest_cache/
node_modules/
dist/
.env
```

- [ ] **Step 4: Write api/Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 5: Write api/requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
Pillow==10.4.0
img2pdf==0.5.1
pypdf==4.3.1
python-multipart==0.0.9
pytest==8.3.2
httpx==0.27.2
```

- [ ] **Step 6: Write frontend/nginx.conf**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    client_max_body_size 1G;

    location /api/ {
        proxy_pass http://api:8000/api/;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 7: Write frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 8: Commit**

```bash
git init
git add docker-compose.yml .gitignore api/Dockerfile api/requirements.txt api/tests/__init__.py frontend/Dockerfile frontend/nginx.conf
git commit -m "chore: project skeleton — Docker Compose + api/frontend structure"
```

---

## Task 2: Backend — FastAPI health endpoint

**Files:**
- Create: `api/main.py`
- Create: `api/tests/test_health.py`

- [ ] **Step 1: Write failing test**

```python
# api/tests/test_health.py
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from main import app

client = TestClient(app)

def test_health_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd api && pip install -r requirements.txt && pytest tests/test_health.py -v
```
Expected: `ModuleNotFoundError: No module named 'main'`

- [ ] **Step 3: Write minimal main.py**

```python
# api/main.py
from fastapi import FastAPI

app = FastAPI()


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd api && pytest tests/test_health.py -v
```
Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add api/main.py api/tests/test_health.py
git commit -m "feat(api): FastAPI app with /api/health endpoint"
```

---

## Task 3: Backend — converter.py

**Files:**
- Create: `api/converter.py`
- Create: `api/tests/test_converter.py`

- [ ] **Step 1: Write failing tests**

```python
# api/tests/test_converter.py
import io
import pytest
from PIL import Image
from pypdf import PdfReader

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from converter import convert_images


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


def test_single_image_fit_returns_pdf():
    result = convert_images(
        [("a.jpg", _jpeg())],
        mode="multi", page_size="fit", orientation="portrait", margin_px=0, quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 1


def test_multi_mode_two_images_merges_pages():
    result = convert_images(
        [("a.jpg", _jpeg()), ("b.jpg", _jpeg())],
        mode="multi", page_size="fit", orientation="portrait", margin_px=0, quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 2


def test_single_mode_two_images_returns_list():
    result = convert_images(
        [("a.jpg", _jpeg()), ("b.jpg", _jpeg())],
        mode="single", page_size="fit", orientation="portrait", margin_px=0, quality_dpi=150,
    )
    assert isinstance(result, list)
    assert len(result) == 2
    for pdf in result:
        assert _page_count(pdf) == 1


def test_a4_page_size():
    result = convert_images(
        [("a.jpg", _jpeg())],
        mode="multi", page_size="A4", orientation="portrait", margin_px=0, quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 1


def test_landscape_orientation():
    # portrait image (100x150) with landscape → should rotate
    result = convert_images(
        [("a.jpg", _jpeg(100, 150))],
        mode="multi", page_size="fit", orientation="landscape", margin_px=0, quality_dpi=150,
    )
    assert isinstance(result, bytes)


def test_margin_applied():
    result = convert_images(
        [("a.jpg", _jpeg())],
        mode="multi", page_size="fit", orientation="portrait", margin_px=20, quality_dpi=150,
    )
    assert isinstance(result, bytes)


def test_png_rgba_converted():
    result = convert_images(
        [("a.png", _png_rgba())],
        mode="multi", page_size="fit", orientation="portrait", margin_px=0, quality_dpi=150,
    )
    assert isinstance(result, bytes)
    assert _page_count(result) == 1
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd api && pytest tests/test_converter.py -v
```
Expected: `ModuleNotFoundError: No module named 'converter'`

- [ ] **Step 3: Write converter.py**

```python
# api/converter.py
import datetime
import io
import zipfile
from pathlib import Path

import img2pdf
from PIL import Image
from pypdf import PdfWriter, PdfReader

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
        return img2pdf.convert(buf.getvalue())

    w_mm, h_mm = PAGE_SIZES_MM[page_size]
    if orientation == "landscape":
        w_mm, h_mm = h_mm, w_mm

    page_w_px = int(w_mm / MM_PER_INCH * quality_dpi)
    page_h_px = int(h_mm / MM_PER_INCH * quality_dpi)

    img.thumbnail((page_w_px, page_h_px), Image.LANCZOS)

    page_canvas = Image.new("RGB", (page_w_px, page_h_px), (255, 255, 255))
    page_canvas.paste(
        img,
        ((page_w_px - img.width) // 2, (page_h_px - img.height) // 2),
    )
    page_canvas.save(buf, format="JPEG", quality=95)

    layout_fun = img2pdf.get_layout_fun(
        pagesize=(w_mm * PT_PER_MM, h_mm * PT_PER_MM)
    )
    return img2pdf.convert(buf.getvalue(), layout_fun=layout_fun)


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
        for filename, pdf_bytes in zip(filenames, pdfs):
            zf.writestr(Path(filename).stem + ".pdf", pdf_bytes)
    return buf.getvalue()
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd api && pytest tests/test_converter.py -v
```
Expected: all 7 tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add api/converter.py api/tests/test_converter.py
git commit -m "feat(api): image conversion logic — Pillow + img2pdf + pypdf"
```

---

## Task 4: Backend — /api/convert route

**Files:**
- Modify: `api/main.py`
- Create: `api/tests/test_convert_route.py`

- [ ] **Step 1: Write failing tests**

```python
# api/tests/test_convert_route.py
import io
import zipfile
from PIL import Image
from fastapi.testclient import TestClient
import sys, os
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd api && pytest tests/test_convert_route.py -v
```
Expected: errors about missing route `/api/convert`

- [ ] **Step 3: Add /api/convert to main.py**

```python
# api/main.py
import datetime
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

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
        raise HTTPException(400, detail={"error": f"Too many images (max {MAX_IMAGES})"})

    image_files: list[tuple[str, bytes]] = []
    for upload in images:
        if upload.content_type not in ALLOWED_MIMES:
            raise HTTPException(400, detail={"error": f"Unsupported type: {upload.content_type}"})
        data = await upload.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(400, detail={"error": f"File too large: {upload.filename}"})
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
```

- [ ] **Step 4: Run all backend tests — verify they pass**

```bash
cd api && pytest tests/ -v
```
Expected: all 13 tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add api/main.py api/tests/test_convert_route.py
git commit -m "feat(api): /api/convert — multi/single mode, PDF and ZIP responses"
```

---

## Task 5: Frontend scaffold + types + api.ts + validation.ts

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api.ts`
- Create: `frontend/src/validation.ts`
- Create: `frontend/src/tests/api.test.ts`
- Create: `frontend/src/tests/validation.test.ts`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "image-pdf-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.2.3",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react-pdf": "^9.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.3",
    "vite": "^5.4.1",
    "vitest": "^2.0.5",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.6",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Write vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write tailwind.config.ts and postcss.config.js**

```typescript
// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

```javascript
// frontend/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Write index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IMG → PDF</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write src/main.tsx**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { pdfjs } from "react-pdf";
import App from "./App";
import "./index.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Write types.ts**

```typescript
// frontend/src/types.ts
export type Mode = "multi" | "single";
export type PageSize = "A4" | "Letter" | "fit";
export type Orientation = "portrait" | "landscape";

export interface ImageFile {
  id: string;
  file: File;
}

export interface ConvertOptions {
  mode: Mode;
  page_size: PageSize;
  orientation: Orientation;
  margin_px: number;
  quality: number;
}

export type ResponseType = "pdf" | "zip";

export interface AppState {
  images: ImageFile[];
  options: ConvertOptions;
  resultBlob: Blob | null;
  resultType: ResponseType | null;
  error: string | null;
  loading: boolean;
}
```

- [ ] **Step 8: Write api.ts**

```typescript
// frontend/src/api.ts
import type { ConvertOptions, ResponseType } from "./types";

export async function convertImages(
  files: File[],
  options: ConvertOptions
): Promise<{ blob: Blob; type: ResponseType }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("images", f));
  formData.append("mode", options.mode);
  formData.append("page_size", options.page_size);
  formData.append("orientation", options.orientation);
  formData.append("margin_px", String(options.margin_px));
  formData.append("quality", String(options.quality));

  const response = await fetch("/api/convert", { method: "POST", body: formData });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Conversion failed" }));
    throw new Error(data.error ?? "Conversion failed");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const blob = await response.blob();
  const type: ResponseType = contentType.includes("zip") ? "zip" : "pdf";
  return { blob, type };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 9: Write validation.ts**

```typescript
// frontend/src/validation.ts
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export interface ValidationError {
  filename: string;
  message: string;
}

export function validateFiles(files: File[]): ValidationError[] {
  return files.flatMap((file) => {
    const errors: ValidationError[] = [];
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push({ filename: file.name, message: "Only PNG and JPG are supported" });
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push({ filename: file.name, message: "File exceeds 20 MB limit" });
    }
    return errors;
  });
}
```

- [ ] **Step 10: Write tests for api.ts and validation.ts**

```typescript
// frontend/src/tests/api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertImages } from "../api";

const makeFile = (name = "test.jpg", type = "image/jpeg") =>
  new File([new Uint8Array(10)], name, { type });

describe("convertImages", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns pdf blob on success", async () => {
    const mockBlob = new Blob(["pdf"], { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/pdf" },
      blob: () => Promise.resolve(mockBlob),
    } as unknown as Response);

    const result = await convertImages([makeFile()], {
      mode: "multi", page_size: "A4", orientation: "portrait", margin_px: 0, quality: 150,
    });

    expect(result.type).toBe("pdf");
    expect(result.blob).toBe(mockBlob);
  });

  it("returns zip type when content-type is application/zip", async () => {
    const mockBlob = new Blob(["zip"], { type: "application/zip" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/zip" },
      blob: () => Promise.resolve(mockBlob),
    } as unknown as Response);

    const result = await convertImages([makeFile(), makeFile("b.jpg")], {
      mode: "single", page_size: "fit", orientation: "portrait", margin_px: 0, quality: 150,
    });
    expect(result.type).toBe("zip");
  });

  it("throws error message from API on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Unsupported type" }),
    } as unknown as Response);

    await expect(
      convertImages([makeFile()], {
        mode: "multi", page_size: "A4", orientation: "portrait", margin_px: 0, quality: 150,
      })
    ).rejects.toThrow("Unsupported type");
  });
});
```

```typescript
// frontend/src/tests/validation.test.ts
import { describe, it, expect } from "vitest";
import { validateFiles } from "../validation";

const makeFile = (name: string, type: string, size: number) =>
  Object.defineProperty(new File([], name, { type }), "size", { value: size });

describe("validateFiles", () => {
  it("accepts PNG", () => {
    expect(validateFiles([makeFile("a.png", "image/png", 100)])).toHaveLength(0);
  });

  it("accepts JPEG", () => {
    expect(validateFiles([makeFile("a.jpg", "image/jpeg", 100)])).toHaveLength(0);
  });

  it("rejects GIF", () => {
    const errors = validateFiles([makeFile("a.gif", "image/gif", 100)]);
    expect(errors[0].message).toContain("PNG and JPG");
  });

  it("rejects file over 20 MB", () => {
    const errors = validateFiles([makeFile("a.jpg", "image/jpeg", 21 * 1024 * 1024)]);
    expect(errors[0].message).toContain("20 MB");
  });

  it("returns multiple errors for multiple bad files", () => {
    const errors = validateFiles([
      makeFile("a.gif", "image/gif", 100),
      makeFile("b.jpg", "image/jpeg", 21 * 1024 * 1024),
    ]);
    expect(errors).toHaveLength(2);
  });
});
```

- [ ] **Step 11: Install deps and run tests**

```bash
cd frontend && npm install && npm test
```
Expected: 8 tests `PASSED`

- [ ] **Step 12: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): Vite scaffold, types, api.ts, validation.ts + tests"
```

---

## Task 6: Frontend — useAppState hook

**Files:**
- Create: `frontend/src/hooks/useAppState.ts`

- [ ] **Step 1: Write useAppState.ts**

```typescript
// frontend/src/hooks/useAppState.ts
import { useState, useCallback } from "react";
import type { AppState, ImageFile, ConvertOptions } from "../types";

const DEFAULT_OPTIONS: ConvertOptions = {
  mode: "multi",
  page_size: "A4",
  orientation: "portrait",
  margin_px: 0,
  quality: 150,
};

export function useAppState() {
  const [state, setState] = useState<AppState>({
    images: [],
    options: DEFAULT_OPTIONS,
    resultBlob: null,
    resultType: null,
    error: null,
    loading: false,
  });

  const setImages = useCallback((images: ImageFile[]) => {
    setState((s) => ({ ...s, images, resultBlob: null, resultType: null, error: null }));
  }, []);

  const setOptions = useCallback((patch: Partial<ConvertOptions>) => {
    setState((s) => ({ ...s, options: { ...s.options, ...patch } }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((s) => ({ ...s, loading, error: loading ? null : s.error }));
  }, []);

  const setResult = useCallback((resultBlob: Blob, resultType: "pdf" | "zip") => {
    setState((s) => ({ ...s, resultBlob, resultType, loading: false, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((s) => ({ ...s, error, loading: false }));
  }, []);

  return { state, setImages, setOptions, setLoading, setResult, setError };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useAppState.ts
git commit -m "feat(frontend): useAppState hook"
```

---

## Task 7: Frontend — Step 1 (DropZone + ImageGrid + ErrorBanner)

**Files:**
- Create: `frontend/src/components/ErrorBanner.tsx`
- Create: `frontend/src/components/DropZone.tsx`
- Create: `frontend/src/components/ImageGrid.tsx`
- Create: `frontend/src/components/Step1Upload.tsx`

- [ ] **Step 1: Write ErrorBanner.tsx**

```tsx
// frontend/src/components/ErrorBanner.tsx
interface Props {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-red-900/40 border border-red-500 px-4 py-3 text-sm text-red-200">
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 text-red-400 hover:text-red-200">✕</button>
    </div>
  );
}
```

- [ ] **Step 2: Write DropZone.tsx**

```tsx
// frontend/src/components/DropZone.tsx
import { useDropzone } from "react-dropzone";

interface Props {
  onDrop: (files: File[]) => void;
}

export function DropZone({ onDrop }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    onDrop,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-12 cursor-pointer transition-colors ${
        isDragActive
          ? "border-blue-400 bg-blue-900/20"
          : "border-gray-600 hover:border-gray-400 bg-gray-800/40"
      }`}
    >
      <input {...getInputProps()} />
      <span className="text-4xl mb-3">⬆</span>
      <p className="text-gray-300 text-sm font-medium">
        {isDragActive ? "Solte as imagens aqui" : "Arraste imagens ou clique para selecionar"}
      </p>
      <p className="text-gray-500 text-xs mt-1">PNG / JPG — múltiplos arquivos</p>
    </div>
  );
}
```

- [ ] **Step 3: Write ImageGrid.tsx**

Each image is assigned a unique `id` (via `crypto.randomUUID()`) when added to state — this is handled in `Step1Upload.tsx`. `ImageGrid` receives `ImageFile[]` and callbacks.

```tsx
// frontend/src/components/ImageGrid.tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ImageFile } from "../types";

function SortableRow({ item, onRemove }: { item: ImageFile; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg bg-gray-800 px-3 py-2"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-500 select-none">⠿⠿</span>
      <span className="text-sm text-gray-300 flex-1 truncate">{item.file.name}</span>
      <span className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
      <button onClick={onRemove} className="text-red-400 hover:text-red-200 text-sm">✕</button>
    </div>
  );
}

interface Props {
  images: ImageFile[];
  onReorder: (images: ImageFile[]) => void;
  onRemove: (id: string) => void;
}

export function ImageGrid({ images, onReorder, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((i) => i.id === active.id);
      const newIndex = images.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {images.map((item) => (
            <SortableRow key={item.id} item={item} onRemove={() => onRemove(item.id)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 4: Write Step1Upload.tsx**

```tsx
// frontend/src/components/Step1Upload.tsx
import type { ImageFile } from "../types";
import { validateFiles } from "../validation";
import { DropZone } from "./DropZone";
import { ImageGrid } from "./ImageGrid";
import { ErrorBanner } from "./ErrorBanner";
import { useState } from "react";

interface Props {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  onNext: () => void;
}

export function Step1Upload({ images, onChange, onNext }: Props) {
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleDrop(files: File[]) {
    const errors = validateFiles(files);
    if (errors.length > 0) {
      setValidationError(errors.map((e) => `${e.filename}: ${e.message}`).join(" · "));
      return;
    }
    setValidationError(null);
    const newItems: ImageFile[] = files.map((f) => ({ id: crypto.randomUUID(), file: f }));
    onChange([...images, ...newItems]);
  }

  return (
    <div className="flex flex-col gap-4">
      {validationError && (
        <ErrorBanner message={validationError} onDismiss={() => setValidationError(null)} />
      )}
      <DropZone onDrop={handleDrop} />
      {images.length > 0 && (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {images.length} imagem{images.length !== 1 ? "s" : ""} — arraste para reordenar
          </p>
          <ImageGrid
            images={images}
            onReorder={onChange}
            onRemove={(id) => onChange(images.filter((i) => i.id !== id))}
          />
          <div className="flex justify-end pt-2">
            <button
              onClick={onNext}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-2 text-sm font-semibold text-white transition-colors"
            >
              Próximo: Opções →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ErrorBanner.tsx frontend/src/components/DropZone.tsx frontend/src/components/ImageGrid.tsx frontend/src/components/Step1Upload.tsx
git commit -m "feat(frontend): Step1Upload — DropZone, ImageGrid with drag-to-reorder"
```

---

## Task 8: Frontend — Step 2 (Options)

**Files:**
- Create: `frontend/src/components/Step2Options.tsx`

- [ ] **Step 1: Write Step2Options.tsx**

```tsx
// frontend/src/components/Step2Options.tsx
import type { ConvertOptions } from "../types";

interface Props {
  options: ConvertOptions;
  onChange: (patch: Partial<ConvertOptions>) => void;
  onBack: () => void;
  onNext: () => void;
}

function Toggle({
  options: choices,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {choices.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            value === c.value
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function Step2Options({ options, onChange, onBack, onNext }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Modo</label>
        <Toggle
          options={[
            { label: "Múltiplas → 1 PDF", value: "multi" },
            { label: "1 PDF por imagem", value: "single" },
          ]}
          value={options.mode}
          onChange={(v) => onChange({ mode: v as ConvertOptions["mode"] })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Tamanho da página</label>
        <Toggle
          options={[
            { label: "A4", value: "A4" },
            { label: "Letter", value: "Letter" },
            { label: "Ajustar à imagem", value: "fit" },
          ]}
          value={options.page_size}
          onChange={(v) => onChange({ page_size: v as ConvertOptions["page_size"] })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Orientação</label>
        <Toggle
          options={[
            { label: "Retrato", value: "portrait" },
            { label: "Paisagem", value: "landscape" },
          ]}
          value={options.orientation}
          onChange={(v) => onChange({ orientation: v as ConvertOptions["orientation"] })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">
          Margem — <span className="text-white">{options.margin_px}px</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={options.margin_px}
          onChange={(e) => onChange({ margin_px: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">
          Qualidade — <span className="text-white">{options.quality} dpi</span>
        </label>
        <input
          type="range"
          min={72}
          max={300}
          step={1}
          value={options.quality}
          onChange={(e) => onChange({ quality: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <p className="text-xs text-gray-500">
          Afeta resolução para tamanhos fixos (A4/Letter). Ignorado no modo "ajustar à imagem".
        </p>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="rounded-lg bg-gray-700 hover:bg-gray-600 px-6 py-2 text-sm text-gray-300 transition-colors"
        >
          ← Voltar
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-2 text-sm font-semibold text-white transition-colors"
        >
          Converter e Preview →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Step2Options.tsx
git commit -m "feat(frontend): Step2Options — mode, page size, orientation, margin, quality"
```

---

## Task 9: Frontend — Step 3 (Preview + Download)

**Files:**
- Create: `frontend/src/components/Step3Preview.tsx`

- [ ] **Step 1: Write Step3Preview.tsx**

```tsx
// frontend/src/components/Step3Preview.tsx
import { useState, useMemo } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { downloadBlob } from "../api";
import { ErrorBanner } from "./ErrorBanner";

interface Props {
  blob: Blob;
  type: "pdf" | "zip";
  onBack: () => void;
  onReset: () => void;
}

export function Step3Preview({ blob, type, onBack, onReset }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const blobUrl = useMemo(() => URL.createObjectURL(blob), [blob]);

  const filename =
    type === "zip"
      ? `images-${new Date().toISOString().slice(0, 10)}.zip`
      : "converted.pdf";

  if (type === "zip") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="text-5xl">📦</div>
        <p className="text-gray-300 text-sm">
          {blob.size > 0
            ? `ZIP gerado — ${(blob.size / 1024 / 1024).toFixed(2)} MB`
            : "ZIP gerado"}
        </p>
        <button
          onClick={() => downloadBlob(blob, filename)}
          className="rounded-lg bg-green-600 hover:bg-green-500 px-8 py-3 text-sm font-semibold text-white transition-colors"
        >
          ⬇ Baixar ZIP
        </button>
        <div className="flex gap-3 pt-4">
          <button onClick={onBack} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">← Voltar</button>
          <button onClick={onReset} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">Nova conversão</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pdfError && <ErrorBanner message={pdfError} onDismiss={() => setPdfError(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          Preview — página {pageNumber} {numPages ? `de ${numPages}` : ""}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="rounded bg-gray-700 px-3 py-1 text-xs disabled:opacity-40"
          >
            ‹
          </button>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages ?? 1, p + 1))}
            disabled={pageNumber >= (numPages ?? 1)}
            className="rounded bg-gray-700 px-3 py-1 text-xs disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-700 bg-gray-900 flex justify-center p-4 max-h-[60vh]">
        <Document
          file={blobUrl}
          onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
          onLoadError={(err) => setPdfError(`Erro ao carregar preview: ${err.message}`)}
        >
          <Page pageNumber={pageNumber} width={500} />
        </Document>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button onClick={onBack} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">← Voltar</button>
          <button onClick={onReset} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">Nova conversão</button>
        </div>
        <button
          onClick={() => downloadBlob(blob, filename)}
          className="rounded-lg bg-green-600 hover:bg-green-500 px-8 py-2 text-sm font-semibold text-white transition-colors"
        >
          ⬇ Baixar PDF
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Step3Preview.tsx
git commit -m "feat(frontend): Step3Preview — react-pdf viewer + download"
```

---

## Task 10: Frontend — WizardStepper + App integration

**Files:**
- Create: `frontend/src/components/WizardStepper.tsx`
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: Write WizardStepper.tsx**

```tsx
// frontend/src/components/WizardStepper.tsx
const STEPS = ["Upload & Ordem", "Opções PDF", "Preview & Download"];

export function WizardStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < current
                  ? "bg-blue-500 text-white"
                  : i === current
                  ? "bg-blue-600 text-white ring-2 ring-blue-400"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs whitespace-nowrap ${
                i === current ? "text-blue-400 font-medium" : "text-gray-500"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mb-5 mx-2 transition-colors ${
                i < current ? "bg-blue-500" : "bg-gray-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write App.tsx**

```tsx
// frontend/src/App.tsx
import { useState } from "react";
import { useAppState } from "./hooks/useAppState";
import { convertImages } from "./api";
import { WizardStepper } from "./components/WizardStepper";
import { Step1Upload } from "./components/Step1Upload";
import { Step2Options } from "./components/Step2Options";
import { Step3Preview } from "./components/Step3Preview";
import { ErrorBanner } from "./components/ErrorBanner";

export default function App() {
  const [step, setStep] = useState(0);
  const { state, setImages, setOptions, setLoading, setResult, setError } = useAppState();

  async function handleConvert() {
    setLoading(true);
    try {
      const { blob, type } = await convertImages(
        state.images.map((i) => i.file),
        state.options
      );
      setResult(blob, type);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  function handleReset() {
    setImages([]);
    setStep(0);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center py-12 px-4">
      <h1 className="text-2xl font-bold mb-2 tracking-tight">🖼 IMG → PDF</h1>
      <p className="text-gray-500 text-sm mb-8">Conversor local — sem limites, sem paywall</p>

      <div className="w-full max-w-xl">
        <WizardStepper current={step} />

        {state.error && (
          <div className="mb-4">
            <ErrorBanner message={state.error} onDismiss={() => setError("")} />
          </div>
        )}

        {step === 0 && (
          <Step1Upload
            images={state.images}
            onChange={setImages}
            onNext={() => setStep(1)}
          />
        )}

        {step === 1 && (
          <Step2Options
            options={state.options}
            onChange={setOptions}
            onBack={() => setStep(0)}
            onNext={handleConvert}
          />
        )}

        {step === 2 && state.resultBlob && state.resultType && (
          <Step3Preview
            blob={state.resultBlob}
            type={state.resultType}
            onBack={() => setStep(1)}
            onReset={handleReset}
          />
        )}

        {state.loading && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
            <div className="bg-gray-800 rounded-xl px-8 py-6 text-sm text-gray-200">
              Convertendo…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run frontend tests to confirm nothing broke**

```bash
cd frontend && npm test
```
Expected: all tests `PASSED`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/WizardStepper.tsx frontend/src/App.tsx
git commit -m "feat(frontend): WizardStepper + App — 3-step wizard fully wired"
```

---

## Task 11: Docker end-to-end smoke test

**Goal:** verify the full stack builds and serves correctly via Docker Compose.

- [ ] **Step 1: Build and start**

```bash
docker compose up --build
```
Expected: no build errors, both containers running.

- [ ] **Step 2: Check API health**

```bash
curl http://localhost:3000/api/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 3: Manual browser test**

Open `http://localhost:3000` and verify:
1. Step 1: drag-and-drop a PNG or JPG onto the zone — file appears in list
2. Reorder by dragging — order changes
3. Click "Próximo: Opções" — wizard advances to Step 2
4. Toggle options (mode, page size, orientation, margin, quality)
5. Click "Converter e Preview" — loading overlay appears, then Step 3 loads
6. PDF preview renders in the browser
7. Click "Baixar PDF" — PDF downloads
8. Access from another device on the LAN via `http://<host-ip>:3000` — same experience

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: verified end-to-end via Docker Compose"
```
