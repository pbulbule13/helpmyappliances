"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFile: (file: File, preview: string) => void;
  preview?: string;
  onClear?: () => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, preview, onClear, disabled }: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onFile(file, url);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"] },
    maxFiles: 1,
    disabled,
  });

  if (preview) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border-2 border-brand-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Appliance label" className="w-full max-h-80 object-contain bg-gray-50" />
        {onClear && (
          <button
            onClick={onClear}
            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow hover:bg-red-50 transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
        isDragActive
          ? "border-brand-500 bg-brand-50"
          : "border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="p-3 bg-brand-100 rounded-full">
          {isDragActive ? (
            <Upload size={28} className="text-brand-600" />
          ) : (
            <Camera size={28} className="text-brand-600" />
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-700">
            {isDragActive ? "Drop the photo here" : "Upload appliance photo"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Drag &amp; drop or <span className="text-brand-600 font-medium">click to browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Photograph the model/serial number label • JPG, PNG, WEBP up to 10 MB
          </p>
        </div>
      </div>
    </div>
  );
}
