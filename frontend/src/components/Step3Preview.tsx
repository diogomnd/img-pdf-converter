import { useEffect, useMemo } from "react";
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
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          Preview do PDF
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
