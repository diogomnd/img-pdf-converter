import type { ImageFile } from "../types";
import { FileList } from "./FileList";

interface Props {
    images: ImageFile[];
    onReorder: (images: ImageFile[]) => void;
    onRemove: (id: string) => void;
}

export function ImageGrid({ images, onReorder, onRemove }: Props) {
    return (
        <FileList items={images} onReorder={onReorder} onRemove={onRemove} />
    );
}
