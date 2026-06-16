const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const PDF_TYPE = "application/pdf";

export interface ValidationError {
    filename: string;
    message: string;
}

export function validateFiles(files: File[]): ValidationError[] {
    return files.flatMap((file) => {
        const errors: ValidationError[] = [];
        if (!ALLOWED_TYPES.includes(file.type)) {
            errors.push({
                filename: file.name,
                message: "Only PNG and JPG are supported",
            });
        }
        if (file.size > MAX_FILE_SIZE) {
            errors.push({
                filename: file.name,
                message: "File exceeds 20 MB limit",
            });
        }
        return errors;
    });
}

export function validatePdfFiles(files: File[]): ValidationError[] {
    return files.flatMap((file) => {
        const errors: ValidationError[] = [];
        const isPdf =
            file.type === PDF_TYPE || file.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            errors.push({
                filename: file.name,
                message: "Only PDF files are supported",
            });
        }
        if (file.size > MAX_FILE_SIZE) {
            errors.push({
                filename: file.name,
                message: "File exceeds 20 MB limit",
            });
        }
        return errors;
    });
}
