# Image to PDF Converter — Design Spec

**Date:** 2026-05-24  
**Stack:** FastAPI + React + Docker Compose  
**Status:** Approved

---

## Overview

Local image-to-PDF converter accessible via browser. Runs via Docker Compose, accessible to all devices on the same local network. Key differentiator: full control over margins (including zero), page size, and orientation — all free, no paywalled features.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Docker Compose (internal network)      │
│                                         │
│  ┌──────────────┐    ┌───────────────┐  │
│  │  frontend    │    │  api          │  │
│  │  nginx:3000  │───▶│  FastAPI:8000 │  │
│  │  Vite build  │    │  img2pdf      │  │
│  └──────────────┘    │  Pillow       │  │
│                      └───────────────┘  │
└─────────────────────────────────────────┘
         ▲
  http://<local-ip>:3000
```

- `frontend` container: nginx serves the Vite production build, proxies `/api/*` to `api:8000`
- `api` container: FastAPI, stateless — converts images and returns PDF or ZIP in response
- No database, no persistent storage — all processing is request-scoped

---

## Backend

### Tech

- Python 3.12
- FastAPI
- `img2pdf` — lossless PNG/JPG → PDF conversion
- `Pillow` — image preprocessing (resize, rotate, apply margins)
- `pypdf` — merge PDF pages when needed

### Endpoints

```
POST /api/convert
  Content-Type: multipart/form-data
  Fields:
    images[]        File[]     PNG or JPG files
    mode            string     "multi" | "single"
    page_size       string     "A4" | "Letter" | "fit"
    orientation     string     "portrait" | "landscape"
    margin_px       int        0–100
    quality         int        72–300

  Response (mode=multi):  application/pdf
  Response (mode=single, N images): application/zip (N PDFs)
  Response (mode=single, 1 image):  application/pdf

  Error: { "error": "<message>" } + HTTP 4xx/5xx

GET /api/health
  Response: { "status": "ok" }
```

### Conversion logic

1. For each image: open with Pillow, apply orientation (rotate if needed), apply margin (add white padding), resize to fit page_size
2. `page_size="fit"` — PDF page dimensions match image dimensions exactly (margin still applied)
3. `img2pdf` converts processed image bytes to PDF page
4. `mode="multi"` — merge all pages into single PDF with `pypdf`
5. `mode="single"` — return individual PDFs; if N > 1, package as ZIP named `images-<timestamp>.zip`, individual files named after original filename with `.pdf` extension

### Validation (backend)

- Accepted MIME types: `image/jpeg`, `image/png`
- Max file size per image: 20 MB
- Max images per request: 50

---

## Frontend

### Tech

- React 18 + Vite
- TypeScript
- TailwindCSS
- `react-dropzone` — drag-and-drop upload
- `dnd-kit` — drag-to-reorder image list
- `react-pdf` — in-browser PDF preview before download

### Component tree

```
App
├── WizardStepper              step indicator (1/2/3)
├── Step1Upload
│   ├── DropZone               drag-and-drop, accepts PNG/JPG
│   └── ImageGrid              thumbnails, drag-to-reorder, remove button
├── Step2Options
│   ├── ModeToggle             "Multiple → 1 PDF" | "1 per image"
│   ├── PageSizeSelect         A4 / Letter / Fit to image
│   ├── OrientationToggle      Portrait / Landscape
│   ├── MarginSlider           0–100px, default 0
│   └── QualitySlider          72–300 dpi, default 150
└── Step3Preview
    ├── PDFViewer              react-pdf renders returned blob
    └── DownloadButton         triggers blob URL download
```

### State shape

```ts
interface AppState {
  images: File[]
  options: {
    mode: "multi" | "single"
    page_size: "A4" | "Letter" | "fit"
    orientation: "portrait" | "landscape"
    margin_px: number
    quality: number
  }
  pdfBlob: Blob | null
  error: string | null
  loading: boolean
}
```

### Validation (frontend, before POST)

- Reject files that are not PNG or JPG — show inline error
- Reject files over 20 MB — show inline error
- Require at least 1 image to proceed past Step 1

### Error handling

- API errors: display toast notification at current step
- Network errors: display toast with retry option
- No full-page crash — errors are recoverable, user stays in wizard

---

## Docker Compose

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

nginx config proxies `/api/` to `http://api:8000/api/`.

### Running

```bash
docker compose up --build
# Access: http://localhost:3000
# LAN access: http://<host-ip>:3000
```

---

## Out of scope

- Authentication / access control
- Conversion history / saved files
- Image editing (crop, rotate, filters)
- Formats beyond PNG and JPG
- Mobile-optimized layout (desktop browser only)
