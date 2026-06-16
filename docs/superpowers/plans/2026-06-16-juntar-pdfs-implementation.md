# Juntar PDFs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated PDF merge workflow that uploads, reorders, removes, merges, previews, and downloads PDFs.

**Architecture:** Keep image conversion and PDF merging as separate backend routes and separate frontend workflows. Reuse `pypdf` on the backend and the existing React/DnD/preview patterns on the frontend.

**Tech Stack:** FastAPI, pypdf, pytest, React 18, TypeScript, Vite, Vitest, React Testing Library, react-dropzone, dnd-kit, Tailwind CSS.

---

## File Structure

- Modify `api/converter.py`: add `PdfMergeError` and `merge_pdfs`.
- Modify `api/main.py`: add PDF upload validation and `POST /api/merge-pdfs`.
- Modify `api/tests/test_converter.py`: add unit tests for merge success and invalid PDFs.
- Add `api/tests/test_merge_pdfs_route.py`: add route-level tests for merge behavior and validation.
- Modify `frontend/src/types.ts`: add `PdfFile`, `ToolMode`, and PDF result state types as needed.
- Modify `frontend/src/validation.ts`: add `validatePdfFiles`.
- Modify `frontend/src/api.ts`: add `mergePdfs`.
- Modify `frontend/src/App.tsx`: add top-level mode selector and route to the PDF workflow.
- Add `frontend/src/components/PdfMergeWorkflow.tsx`: own the PDF merge UI and state.
- Add `frontend/src/components/FileList.tsx`: generic sortable list for image/PDF files.
- Modify `frontend/src/components/ImageGrid.tsx`: delegate to `FileList`.
- Modify frontend tests under `frontend/src/tests`.
- Modify `README.md`: document PDF merge.

---

### Task 1: Backend merge unit

**Files:**
- Modify: `api/tests/test_converter.py`
- Modify: `api/converter.py`

- [ ] **Step 1: Write failing unit tests**

Append tests to `api/tests/test_converter.py`:

```python
from pypdf import PdfWriter
import pytest

from converter import PdfMergeError, merge_pdfs


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


def test_merge_pdfs_preserves_file_order_and_page_count():
    result = merge_pdfs([("one.pdf", _blank_pdf(1)), ("two.pdf", _blank_pdf(2))])
    assert _page_count(result) == 3


def test_merge_pdfs_rejects_encrypted_pdf():
    with pytest.raises(PdfMergeError, match="protected"):
        merge_pdfs([("locked.pdf", _encrypted_pdf())])


def test_merge_pdfs_rejects_malformed_pdf():
    with pytest.raises(PdfMergeError, match="Invalid PDF"):
        merge_pdfs([("broken.pdf", b"not a pdf")])
```

- [ ] **Step 2: Run tests to verify RED**

Run: `cd api && pytest tests/test_converter.py -q`

Expected: FAIL because `PdfMergeError` and `merge_pdfs` do not exist.

- [ ] **Step 3: Implement minimal backend merge function**

In `api/converter.py`, add:

```python
class PdfMergeError(ValueError):
    pass


def merge_pdfs(pdf_files: list[tuple[str, bytes]]) -> bytes:
    writer = PdfWriter()

    for filename, pdf_bytes in pdf_files:
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
        except Exception as exc:
            raise PdfMergeError(f"Invalid PDF: {filename}") from exc

        if reader.is_encrypted:
            raise PdfMergeError(f"PDF is protected: {filename}")

        try:
            pages = list(reader.pages)
        except Exception as exc:
            raise PdfMergeError(f"Invalid PDF: {filename}") from exc

        if not pages:
            raise PdfMergeError(f"PDF has no pages: {filename}")

        for page in pages:
            writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `cd api && pytest tests/test_converter.py -q`

Expected: PASS.

---

### Task 2: Backend route

**Files:**
- Add: `api/tests/test_merge_pdfs_route.py`
- Modify: `api/main.py`

- [ ] **Step 1: Write failing route tests**

Create `api/tests/test_merge_pdfs_route.py` with tests for success, invalid MIME, oversized file, too many files, and malformed PDF. Use `PdfWriter` to generate valid PDFs and `PdfReader` to assert page count.

- [ ] **Step 2: Run tests to verify RED**

Run: `cd api && pytest tests/test_merge_pdfs_route.py -q`

Expected: FAIL with 404 for `/api/merge-pdfs`.

- [ ] **Step 3: Implement route**

In `api/main.py`, add `ALLOWED_PDF_MIMES`, import `merge_pdfs` and `PdfMergeError`, then implement:

```python
@app.post("/api/merge-pdfs")
async def merge_pdfs_route(pdfs: Annotated[list[UploadFile], File()]):
    if len(pdfs) > MAX_IMAGES:
        return JSONResponse(status_code=400, content={"error": f"Too many PDFs (max {MAX_IMAGES})"})

    pdf_files: list[tuple[str, bytes]] = []
    for upload in pdfs:
        filename = upload.filename or "file.pdf"
        is_pdf_type = upload.content_type == "application/pdf"
        is_pdf_name = filename.lower().endswith(".pdf")
        if not is_pdf_type and not is_pdf_name:
            return JSONResponse(status_code=400, content={"error": f"Unsupported type: {upload.content_type}"})
        data = await upload.read()
        if len(data) > MAX_FILE_SIZE:
            return JSONResponse(status_code=400, content={"error": f"File too large: {filename}"})
        pdf_files.append((filename, data))

    try:
        merged = merge_pdfs(pdf_files)
    except PdfMergeError as exc:
        return JSONResponse(status_code=400, content={"error": str(exc)})

    return Response(
        content=merged,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=merged.pdf"},
    )
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `cd api && pytest tests/test_merge_pdfs_route.py tests/test_convert_route.py tests/test_converter.py -q`

Expected: PASS.

---

### Task 3: Frontend API and validation

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/validation.ts`
- Modify: `frontend/src/tests/api.test.ts`
- Modify: `frontend/src/tests/validation.test.ts`

- [ ] **Step 1: Write failing frontend tests**

Add tests that `mergePdfs` posts repeated `pdfs`, returns a PDF blob, and throws API errors. Add `validatePdfFiles` tests for valid PDFs, extension fallback, non-PDF rejection, and size rejection.

- [ ] **Step 2: Run tests to verify RED**

Run: `cd frontend && npm test -- src/tests/api.test.ts src/tests/validation.test.ts`

Expected: FAIL because `mergePdfs` and `validatePdfFiles` do not exist.

- [ ] **Step 3: Implement frontend API and validation**

Add `validatePdfFiles(files: File[])` to `frontend/src/validation.ts` using the 20 MB limit and accepting `application/pdf` or `.pdf`.

Add to `frontend/src/api.ts`:

```ts
export async function mergePdfs(
    files: File[]
): Promise<{ blob: Blob; type: "pdf" }> {
    const formData = new FormData();
    files.forEach((f) => formData.append("pdfs", f));

    const response = await fetch("/api/merge-pdfs", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const data = await response
            .json()
            .catch(() => ({ error: "PDF merge failed" }));
        throw new Error(data.error ?? "PDF merge failed");
    }

    return { blob: await response.blob(), type: "pdf" };
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `cd frontend && npm test -- src/tests/api.test.ts src/tests/validation.test.ts`

Expected: PASS.

---

### Task 4: Frontend PDF workflow UI

**Files:**
- Modify: `frontend/src/types.ts`
- Add: `frontend/src/components/FileList.tsx`
- Modify: `frontend/src/components/ImageGrid.tsx`
- Add: `frontend/src/components/PdfMergeWorkflow.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/tests/App.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Update `App.test.tsx` to assert the mode selector renders and clicking `Juntar PDFs` shows a PDF upload area.

- [ ] **Step 2: Run tests to verify RED**

Run: `cd frontend && npm test -- src/tests/App.test.tsx`

Expected: FAIL because the PDF mode selector does not exist.

- [ ] **Step 3: Implement UI**

Add `PdfFile` and `ToolMode` types. Extract the current sortable list into generic `FileList`. Create `PdfMergeWorkflow` with PDF dropzone, validation error display, sortable/removable file list, merge button, loading overlay, and `Step3Preview` for results. Add the mode selector in `App.tsx`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `cd frontend && npm test -- src/tests/App.test.tsx src/tests/Step3Preview.test.tsx`

Expected: PASS.

---

### Task 5: Documentation and final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Document the new PDF merge feature, accepted PDF inputs, and limits.

- [ ] **Step 2: Run backend verification**

Run: `cd api && pytest -q`

Expected: PASS.

- [ ] **Step 3: Run frontend verification**

Run: `cd frontend && npm test`

Expected: PASS.

- [ ] **Step 4: Run frontend build**

Run: `cd frontend && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add api frontend README.md docs/superpowers/plans/2026-06-16-juntar-pdfs-implementation.md
git commit -m "feat: add PDF merge workflow"
```
