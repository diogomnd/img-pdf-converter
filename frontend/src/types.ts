export type Mode = "multi" | "single";
export type PageSize = "A4" | "Letter" | "fit";
export type Orientation = "portrait" | "landscape";

export interface ImageFile {
    id: string;
    file: File;
}

export interface ConvertOptions {
    mode: Mode;
    page_size: PageSize;
    orientation: Orientation;
    margin_px: number;
    quality: number;
}

export type ResponseType = "pdf" | "zip";

export interface AppState {
    images: ImageFile[];
    options: ConvertOptions;
    resultBlob: Blob | null;
    resultType: ResponseType | null;
    error: string | null;
    loading: boolean;
}
