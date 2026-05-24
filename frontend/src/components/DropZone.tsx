import { useDropzone } from "react-dropzone";

interface Props {
  onDrop: (files: File[]) => void;
}

export function DropZone({ onDrop }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    onDrop,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-12 cursor-pointer transition-colors ${
        isDragActive
          ? "border-blue-400 bg-blue-900/20"
          : "border-gray-600 hover:border-gray-400 bg-gray-800/40"
      }`}
    >
      <input {...getInputProps()} />
      <span className="text-4xl mb-3">⬆</span>
      <p className="text-gray-300 text-sm font-medium">
        {isDragActive ? "Solte as imagens aqui" : "Arraste imagens ou clique para selecionar"}
      </p>
      <p className="text-gray-500 text-xs mt-1">PNG / JPG — múltiplos arquivos</p>
    </div>
  );
}
