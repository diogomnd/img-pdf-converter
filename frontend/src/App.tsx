import { useState } from "react";
import { ArrowRight, FileImage, FileText, Images } from "lucide-react";
import { useAppState } from "./hooks/useAppState";
import { convertImages } from "./api";
import type { ToolMode } from "./types";
import { WizardStepper } from "./components/WizardStepper";
import { Step1Upload } from "./components/Step1Upload";
import { Step2Options } from "./components/Step2Options";
import { Step3Preview } from "./components/Step3Preview";
import { ErrorBanner } from "./components/ErrorBanner";
import { PdfMergeWorkflow } from "./components/PdfMergeWorkflow";

export default function App() {
    const [toolMode, setToolMode] = useState<ToolMode>("images");
    const [step, setStep] = useState(0);
    const { state, setImages, setOptions, setLoading, setResult, setError } =
        useAppState();

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
            <h1 className="text-2xl font-bold mb-2 tracking-tight flex items-center gap-2">
                <FileImage
                    className="h-7 w-7 text-blue-400"
                    aria-hidden="true"
                />
                <span>IMG</span>
                <ArrowRight
                    className="h-5 w-5 text-gray-500"
                    aria-hidden="true"
                />
                <span>PDF</span>
                <FileText
                    className="h-7 w-7 text-green-400"
                    aria-hidden="true"
                />
            </h1>
            <p className="mb-5 text-sm text-gray-500">
                Conversor local — imagens para PDF e união de PDFs
            </p>

            <div className="w-full max-w-xl">
                <div className="mb-8 grid grid-cols-2 gap-2 rounded-lg bg-gray-900 p-1">
                    <button
                        onClick={() => setToolMode("images")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            toolMode === "images"
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        }`}
                    >
                        <span className="inline-flex items-center gap-2">
                            <Images className="h-4 w-4" aria-hidden="true" />
                            Imagens para PDF
                        </span>
                    </button>
                    <button
                        onClick={() => setToolMode("pdfs")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            toolMode === "pdfs"
                                ? "bg-green-600 text-white"
                                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        }`}
                    >
                        <span className="inline-flex items-center gap-2">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            Juntar PDFs
                        </span>
                    </button>
                </div>

                {toolMode === "images" && <WizardStepper current={step} />}

                {toolMode === "images" && state.error && (
                    <div className="mb-4">
                        <ErrorBanner
                            message={state.error}
                            onDismiss={() => setError("")}
                        />
                    </div>
                )}

                {toolMode === "images" && step === 0 && (
                    <Step1Upload
                        images={state.images}
                        onChange={setImages}
                        onNext={() => setStep(1)}
                    />
                )}

                {toolMode === "images" && step === 1 && (
                    <Step2Options
                        options={state.options}
                        onChange={setOptions}
                        onBack={() => setStep(0)}
                        onNext={handleConvert}
                    />
                )}

                {toolMode === "images" &&
                    step === 2 &&
                    state.resultBlob &&
                    state.resultType && (
                        <Step3Preview
                            blob={state.resultBlob}
                            type={state.resultType}
                            onBack={() => setStep(1)}
                            onReset={handleReset}
                        />
                    )}

                {toolMode === "pdfs" && <PdfMergeWorkflow />}

                {toolMode === "images" && state.loading && (
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
