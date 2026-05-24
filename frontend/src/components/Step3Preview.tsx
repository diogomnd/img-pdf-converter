import { useEffect, useMemo } from "react";
import { Archive, ArrowLeft, Download, FileText } from "lucide-react";
import { downloadBlob } from "../api";

interface Props {
  blob: Blob;
  type: "pdf" | "zip";
  onBack: () => void;
  onReset: () => void;
}

export function Step3Preview({ blob, type, onBack, onReset }: Props) {
  const blobUrl = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const filename =
    type === "zip"
      ? `images-${new Date().toISOString().slice(0, 10)}.zip`
      : "converted.pdf";

  if (type === "zip") {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Archive className="h-14 w-14 text-green-400" aria-hidden="true" />
        <p className="text-gray-300 text-sm">
          {blob.size > 0
            ? `ZIP gerado — ${(blob.size / 1024 / 1024).toFixed(2)} MB`
            : "ZIP gerado"}
        </p>
        <button
          onClick={() => downloadBlob(blob, filename)}
          className="rounded-lg bg-green-600 hover:bg-green-500 px-8 py-3 text-sm font-semibold text-white transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar ZIP
          </span>
        </button>
        <div className="flex gap-3 pt-4">
          <button onClick={onBack} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </span>
          </button>
          <button onClick={onReset} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">Nova conversão</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-400" aria-hidden="true" />
            Preview do PDF
          </span>
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 h-[60vh]">
        <iframe
          title="Preview do PDF"
          src={blobUrl}
          className="h-full w-full bg-white"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button onClick={onBack} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </span>
          </button>
          <button onClick={onReset} className="rounded-lg bg-gray-700 hover:bg-gray-600 px-5 py-2 text-sm text-gray-300">Nova conversão</button>
        </div>
        <button
          onClick={() => downloadBlob(blob, filename)}
          className="rounded-lg bg-green-600 hover:bg-green-500 px-8 py-2 text-sm font-semibold text-white transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar PDF
          </span>
        </button>
      </div>
    </div>
  );
}
