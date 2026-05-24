import { Check } from "lucide-react";

const STEPS = ["Upload & Ordem", "Opções PDF", "Preview & Download"];

export function WizardStepper({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0 mb-8">
            {STEPS.map((label, i) => (
                <div
                    key={i}
                    className="flex items-center flex-1 last:flex-none"
                >
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                i < current
                                    ? "bg-blue-500 text-white"
                                    : i === current
                                      ? "bg-blue-600 text-white ring-2 ring-blue-400"
                                      : "bg-gray-700 text-gray-400"
                            }`}
                        >
                            {i < current ? (
                                <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                i + 1
                            )}
                        </div>
                        <span
                            className={`text-xs whitespace-nowrap ${
                                i === current
                                    ? "text-blue-400 font-medium"
                                    : "text-gray-500"
                            }`}
                        >
                            {label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div
                            className={`flex-1 h-0.5 mb-5 mx-2 transition-colors ${
                                i < current ? "bg-blue-500" : "bg-gray-700"
                            }`}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
