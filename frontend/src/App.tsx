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
