import { useState, useCallback } from "react";
import type { AppState, ImageFile, ConvertOptions } from "../types";

const DEFAULT_OPTIONS: ConvertOptions = {
    mode: "multi",
    page_size: "A4",
    orientation: "portrait",
    margin_px: 0,
    quality: 150,
};

export function useAppState() {
    const [state, setState] = useState<AppState>({
        images: [],
        options: DEFAULT_OPTIONS,
        resultBlob: null,
        resultType: null,
        error: null,
        loading: false,
    });

    const setImages = useCallback((images: ImageFile[]) => {
        setState((s) => ({
            ...s,
            images,
            resultBlob: null,
            resultType: null,
            error: null,
        }));
    }, []);

    const setOptions = useCallback((patch: Partial<ConvertOptions>) => {
        setState((s) => ({ ...s, options: { ...s.options, ...patch } }));
    }, []);

    const setLoading = useCallback((loading: boolean) => {
        setState((s) => ({ ...s, loading, error: loading ? null : s.error }));
    }, []);

    const setResult = useCallback(
        (resultBlob: Blob, resultType: "pdf" | "zip") => {
            setState((s) => ({
                ...s,
                resultBlob,
                resultType,
                loading: false,
                error: null,
            }));
        },
        []
    );

    const setError = useCallback((error: string) => {
        setState((s) => ({ ...s, error, loading: false }));
    }, []);

    return { state, setImages, setOptions, setLoading, setResult, setError };
}
