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
