import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ConvertOptions } from "../types";

interface Props {
  options: ConvertOptions;
  onChange: (patch: Partial<ConvertOptions>) => void;
  onBack: () => void;
  onNext: () => void;
}

function Toggle({
  options: choices,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {choices.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            value === c.value
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function Step2Options({ options, onChange, onBack, onNext }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Modo</label>
        <Toggle
          options={[
            { label: "Múltiplas para 1 PDF", value: "multi" },
            { label: "1 PDF por imagem", value: "single" },
          ]}
          value={options.mode}
          onChange={(v) => onChange({ mode: v as ConvertOptions["mode"] })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Tamanho da página</label>
        <Toggle
          options={[
            { label: "A4", value: "A4" },
            { label: "Letter", value: "Letter" },
            { label: "Ajustar à imagem", value: "fit" },
          ]}
          value={options.page_size}
          onChange={(v) => onChange({ page_size: v as ConvertOptions["page_size"] })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Orientação</label>
        <Toggle
          options={[
            { label: "Retrato", value: "portrait" },
            { label: "Paisagem", value: "landscape" },
          ]}
          value={options.orientation}
          onChange={(v) => onChange({ orientation: v as ConvertOptions["orientation"] })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">
          Margem — <span className="text-white">{options.margin_px}px</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={options.margin_px}
          onChange={(e) => onChange({ margin_px: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider">
          Qualidade — <span className="text-white">{options.quality} dpi</span>
        </label>
        <input
          type="range"
          min={72}
          max={300}
          step={1}
          value={options.quality}
          onChange={(e) => onChange({ quality: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <p className="text-xs text-gray-500">
          Afeta resolução para tamanhos fixos (A4/Letter). Ignorado no modo "ajustar à imagem".
        </p>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="rounded-lg bg-gray-700 hover:bg-gray-600 px-6 py-2 text-sm text-gray-300 transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </span>
        </button>
        <button
          onClick={onNext}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-2 text-sm font-semibold text-white transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            Converter e Preview
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  );
}
