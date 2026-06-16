# Image/PDF Converter

Convert JPEG/PNG images to PDF and merge PDF files via a drag-and-drop web UI.

## Stack

- **Backend**: FastAPI + img2pdf + Pillow (Python 3.12)
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Runtime**: Docker Compose

## Features

- Drag-and-drop upload (up to 50 images, 20 MB each)
- Reorder images before converting
- **Modes**: merge all into one PDF, or one PDF per image
- **Page sizes**: fit to image, A4, Letter, A3
- **Orientation**: portrait or landscape
- **Margin** and **quality (DPI)** controls
- Downloads single PDF or ZIP of multiple PDFs
- Dedicated PDF merge workflow
- Reorder and remove PDFs before merging
- Preview and download merged PDFs

## Running

```bash
docker compose up
```

App available at [http://localhost:3000](http://localhost:3000). API at port 8000 (internal).

## Development

### API

```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Run tests:

```bash
pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Run tests:

```bash
npm test
```

## Limits

| Constraint | Value |
|---|---|
| Max images per request | 50 |
| Max PDFs per merge | 50 |
| Max file size | 20 MB |
| Accepted image formats | JPEG, PNG |
| Accepted PDF format | PDF |

## License

MIT
