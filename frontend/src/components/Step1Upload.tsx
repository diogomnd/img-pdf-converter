import type { ImageFile } from "../types";
import { ArrowRight } from "lucide-react";
import { validateFiles } from "../validation";
import { DropZone } from "./DropZone";
import { ImageGrid } from "./ImageGrid";
import { ErrorBanner } from "./ErrorBanner";
import { useState } from "react";

interface Props {
    images: ImageFile[];
    onChange: (images: ImageFile[]) => void;
    onNext: () => void;
}

export function Step1Upload({ images, onChange, onNext }: Props) {
    const [validationError, setValidationError] = useState<string | null>(null);

    function handleDrop(files: File[]) {
        const errors = validateFiles(files);
        if (errors.length > 0) {
            setValidationError(
                errors.map((e) => `${e.filename}: ${e.message}`).join(" · ")
            );
            return;
        }
        setValidationError(null);
        const newItems: ImageFile[] = files.map((f) => ({
            id: crypto.randomUUID(),
            file: f,
        }));
        onChange([...images, ...newItems]);
    }

    return (
        <div className="flex flex-col gap-4">
            {validationError && (
                <ErrorBanner
                    message={validationError}
                    onDismiss={() => setValidationError(null)}
                />
            )}
            <DropZone onDrop={handleDrop} />
            {images.length > 0 && (
                <>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                        {images.length} imagem{images.length !== 1 ? "s" : ""} —
                        arraste para reordenar
                    </p>
                    <ImageGrid
                        images={images}
                        onReorder={onChange}
                        onRemove={(id) =>
                            onChange(images.filter((i) => i.id !== id))
                        }
                    />
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={onNext}
                            className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-2 text-sm font-semibold text-white transition-colors"
                        >
                            <span className="inline-flex items-center gap-2">
                                Próximo: Opções
                                <ArrowRight
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            </span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
