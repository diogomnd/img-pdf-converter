import { X } from "lucide-react";

interface Props {
    message: string;
    onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: Props) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-red-900/40 border border-red-500 px-4 py-3 text-sm text-red-200">
            <span>{message}</span>
            <button
                onClick={onDismiss}
                className="ml-4 text-red-400 hover:text-red-200"
                aria-label="Fechar"
            >
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
