# Juntar PDFs Design

## Context

The project currently converts JPEG/PNG images to PDF through a React wizard and a FastAPI backend. The backend already uses `pypdf` to combine image-derived PDF pages, but the public API and frontend are image-specific.

The new feature adds a dedicated PDF merge workflow. It must not mix PDF behavior with image conversion options such as page size, margin, orientation, or DPI.

## Goals

- Add a dedicated "Juntar PDFs" area beside the existing image-to-PDF flow.
- Let users upload multiple PDF files, reorder them, remove files, merge them, preview the result, and download one final PDF.
- Preserve the current image conversion flow and `/api/convert` behavior.
- Reject unsupported, oversized, corrupted, or password-protected PDFs with clear messages.

## Non-Goals

- No page-level editor in this iteration.
- No password prompt or PDF unlock flow.
- No splitting PDFs.
- No compression, OCR, metadata editing, or page rotation.

## Recommended Approach

Create a separate backend endpoint, `POST /api/merge-pdfs`, and a separate frontend workflow selected from a top-level mode switch:

- `Imagens para PDF`: existing wizard, unchanged in behavior.
- `Juntar PDFs`: new PDF merge screen.

This keeps contracts simple. Image conversion remains image-specific, while PDF merge receives only PDFs and returns only one merged PDF.

## Backend Design

### Route

Add `POST /api/merge-pdfs` in `api/main.py`.

Form field:

- `pdfs`: repeated uploaded files, preserving request order.

Response:

- `200 application/pdf` with `Content-Disposition: attachment; filename=merged.pdf`.
- `400 application/json` with `{ "error": "..." }` for validation or parsing failures.

### Limits

Use the same operational limits as image conversion:

- Maximum files: 50.
- Maximum file size: 20 MB per file.
- Accepted MIME/content: `application/pdf`, with `.pdf` filename fallback for browsers that omit or vary MIME type.

### Merge Logic

Add `merge_pdfs(pdf_files: list[tuple[str, bytes]]) -> bytes` in `api/converter.py`.

Behavior:

1. Iterate files in the order received.
2. Read each file with `PdfReader`.
3. Reject encrypted PDFs.
4. Reject unreadable or malformed PDFs.
5. Copy every page into a `PdfWriter`.
6. Return the writer output as bytes.

The route handles upload validation. The converter handles PDF parsing and merge errors.

## Frontend Design

### Top-Level Mode

Add an app-level selector near the title:

- `Imagens para PDF`
- `Juntar PDFs`

When `Imagens para PDF` is selected, the existing wizard remains visible. When `Juntar PDFs` is selected, the PDF workflow replaces the wizard content.

### PDF Workflow

The PDF screen has four states:

1. Empty upload state with a PDF-only dropzone.
2. Selected files list with reorder and remove controls.
3. Loading overlay while merging.
4. Preview/download state after merge succeeds.

Controls:

- Dropzone accepts `.pdf` files.
- File list shows filename and size.
- Users can reorder files before merge.
- Users can remove individual files.
- Primary action: `Juntar PDFs`.
- Result uses the existing PDF preview pattern: iframe preview plus `Baixar PDF`.

### Frontend State

Introduce PDF-specific state rather than overloading `images`:

- `pdfs: PdfFile[]`
- `mergedBlob: Blob | null`
- `error: string | null`
- `loading: boolean`

`PdfFile` should mirror the current image item shape:

- `id: string`
- `file: File`

The current image state and options remain separate.

### API Client

Add `mergePdfs(files: File[]): Promise<{ blob: Blob; type: "pdf" }>` in `frontend/src/api.ts`.

It posts `FormData` with repeated `pdfs` fields to `/api/merge-pdfs`, parses error JSON on failure, and returns the PDF blob on success.

## Validation and Errors

Frontend validation should catch common issues early:

- Non-PDF files: "Use apenas arquivos PDF."
- Files over 20 MB: "Arquivo excede o limite de 20 MB."
- Empty selection: keep the merge button disabled.

Backend validation remains authoritative:

- Too many PDFs.
- Unsupported content type or extension.
- Oversized files.
- Corrupted PDF.
- Password-protected PDF.
- PDF with no pages, if encountered.

Error messages should name the file when possible.

## Testing Plan

### Backend Unit Tests

Add tests in `api/tests/test_converter.py` for:

- Merging two valid PDFs preserves page order and total page count.
- Encrypted PDF is rejected.
- Malformed PDF bytes are rejected.

### Backend Route Tests

Add tests in `api/tests/test_convert_route.py` or a new route test file for:

- `POST /api/merge-pdfs` returns `application/pdf` for valid PDFs.
- Files are merged in request order.
- Unsupported file type returns `400`.
- Oversized file returns `400`.
- Too many files returns `400`.
- Invalid/protected PDF returns `400`.

### Frontend Tests

Add or update tests for:

- `mergePdfs` posts to `/api/merge-pdfs` with repeated `pdfs` fields.
- `mergePdfs` returns a PDF blob on success.
- `mergePdfs` throws the API error message on failure.
- PDF validation accepts `.pdf`/`application/pdf` and rejects other file types.
- The app renders the top-level mode selector and can show the PDF workflow.

## Rollout Notes

The implementation should be incremental:

1. Add backend merge tests and endpoint.
2. Add frontend API and validation tests.
3. Add the top-level mode selector and PDF workflow UI.
4. Run backend and frontend tests.
5. Update `README.md` feature and limit descriptions.
