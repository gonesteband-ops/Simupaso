import { useRef, useState } from "react";

type ImageDropZoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
};

export function ImageDropZone({
  onFiles,
  disabled = false,
  compact = false,
  label = "Cargar capturas",
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  };

  return (
    <div
      className={`image-drop-zone${compact ? " compact" : ""}${dragging ? " dragging" : ""}`}
      tabIndex={0}
      aria-label="Zona para cargar capturas"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) emit(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        if (disabled) return;
        const files = Array.from(event.clipboardData.files);
        if (files.length > 0) {
          event.preventDefault();
          onFiles(files);
        }
      }}
    >
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        aria-label={label}
        disabled={disabled}
        onChange={(event) => {
          emit(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="drop-zone-copy">
        <strong>{label}</strong>
        <span>Arrastra imágenes aquí, selecciónalas o pégalas con Ctrl+V.</span>
        <span className="drop-zone-hint">PNG, JPG o WebP · máximo 10 MB por imagen</span>
      </div>
      <button
        type="button"
        className="secondary-button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Seleccionar archivos
      </button>
      <p className="privacy-note">
        Las capturas se procesan y quedan solo en este navegador. Difumina los datos sensibles
        antes de exportar.
      </p>
    </div>
  );
}
