"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image, File } from "lucide-react";

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

interface FileUploaderProps {
  onFileReady: (file: UploadedFile) => void;
  accept?: string;
  maxSizeMB?: number;
}

const ACCEPT_DEFAULT =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp";

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image size={20} />;
  if (type === "application/pdf") return <FileText size={20} />;
  return <File size={20} />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({
  onFileReady,
  accept = ACCEPT_DEFAULT,
  maxSizeMB = 10,
}: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (f: globalThis.File) => {
      setError(null);

      if (f.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum ${maxSizeMB}MB.`);
        return;
      }

      setLoading(true);
      try {
        const buffer = await f.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        const uploaded: UploadedFile = {
          name: f.name,
          type: f.type,
          size: f.size,
          base64,
        };

        setFile(uploaded);
        onFileReady(uploaded);
      } catch {
        setError("Failed to read file");
      } finally {
        setLoading(false);
      }
    },
    [maxSizeMB, onFileReady]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  function clear() {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3">
        <div className="text-muted-foreground">{getFileIcon(file.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <button
          onClick={clear}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-secondary/30"
        }`}
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Processing...</p>
        ) : (
          <>
            <Upload
              size={24}
              className={`mb-2 ${dragging ? "text-primary" : "text-muted-foreground"}`}
            />
            <p className="text-sm font-medium">
              Drop a file here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, PNG, JPG — up to {maxSizeMB}MB
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
