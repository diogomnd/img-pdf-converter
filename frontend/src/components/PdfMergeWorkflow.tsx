import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Merge, Upload } from "lucide-react";
import type { PdfFile } from "../types";
import { mergePdfs } from "../api";
import { validatePdfFiles } from "../validation";
import { ErrorBanner } from "./ErrorBanner";
import { FileList } from "./FileList";
import { Step3Preview } from "./Step3Preview";

function createItem(file: File): PdfFile {
    return {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        file,
    };
}

export function PdfMergeWorkflow() {
    const [pdfs, setPdfs] = useState<PdfFile[]>([]);
    const [resultBlob, setResultBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function handleDrop(files: File[]) {
        const errors = validatePdfFiles(files);
        if (errors.length > 0) {
            setError(
                errors.map((e) => `${e.filename}: ${e.message}`).join(" · ")
            );
            return;
        }

        setError(null);
        setResultBlob(null);
        setPdfs((current) => [...current, ...files.map(createItem)]);
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { "application/pdf": [".pdf"] },
        multiple: true,
        onDrop: handleDrop,
        onDropRejected: (rejections) => {
            const names = rejections.map((r) => r.file.name).join(", ");
            setError(`Formato não suportado: ${names}. Use PDF.`);
        },
    });

    async function handleMerge() {
        setLoading(true);
        setError(null);

        try {
            const result = await mergePdfs(pdfs.map((item) => item.file));
            setResultBlob(result.blob);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setPdfs([]);
        setResultBlob(null);
        setError(null);
    }

    if (resultBlob) {
        return (
            <div className="relative">
                {error && (
                    <div className="mb-4">
                        <ErrorBanner
                            message={error}
                            onDismiss={() => setError(null)}
                        />
                    </div>
                )}
                <Step3Preview
                    blob={resultBlob}
                    type="pdf"
                    onBack={() => setResultBlob(null)}
                    onReset={handleReset}
                />
            </div>
        );
    }

    return (
        <div className="relative flex flex-col gap-4">
            {error && (
                <ErrorBanner message={error} onDismiss={() => setError(null)} />
            )}

            <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-12 transition-colors ${
                    isDragActive
                        ? "border-green-400 bg-green-900/20"
                        : "border-gray-600 bg-gray-800/40 hover:border-gray-400"
                }`}
            >
                <input {...getInputProps()} />
                <Upload
                    className="mb-3 h-10 w-10 text-green-400"
                    aria-hidden="true"
                />
                <p className="text-sm font-medium text-gray-300">
                    {isDragActive
                        ? "Solte os PDFs aqui"
                        : "Arraste PDFs ou clique para selecionar"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                    PDF — múltiplos arquivos
                </p>
            </div>

            {pdfs.length > 0 && (
                <>
                    <p className="text-xs uppercase tracking-wider text-gray-500">
                        {pdfs.length} PDF{pdfs.length !== 1 ? "s" : ""} —
                        arraste para reordenar
                    </p>
                    <FileList
                        items={pdfs}
                        onReorder={setPdfs}
                        onRemove={(id) =>
                            setPdfs((current) =>
                                current.filter((item) => item.id !== id)
                            )
                        }
                    />
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleMerge}
                            disabled={loading || pdfs.length === 0}
                            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                        >
                            <span className="inline-flex items-center gap-2">
                                <Merge className="h-4 w-4" aria-hidden="true" />
                                Juntar PDFs
                            </span>
                        </button>
                    </div>
                </>
            )}

            {loading && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60">
                    <div className="rounded-xl bg-gray-800 px-8 py-6 text-sm text-gray-200">
                        <span className="inline-flex items-center gap-2">
                            <FileText
                                className="h-4 w-4 text-green-400"
                                aria-hidden="true"
                            />
                            Juntando PDFs…
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
