"use client";
import { useRef, useState, useEffect } from "react";
import {
  FileAttachment,
  validateFile,
  fileToBase64,
  generateAttachmentId,
  getAcceptedFileTypes,
} from "@/utils/attachments";

type EnviarResumoBotComponentProps = {
  currentStep: number;
  userChoice: "A" | "B" | null;
  isEnglishFlow: boolean;
  isPortugueseFlow: boolean;
  onDocumentsAnalyzed: (attachments: FileAttachment[]) => void;
  isLoading?: boolean;
  onFileInputRef?: (ref: React.MutableRefObject<HTMLInputElement | null>) => void;
  onUploadLoadingChange?: (isLoading: boolean) => void;
  fileUploaded?: boolean;
};

export default function EnviarResumoBotComponent({
  currentStep,
  userChoice,
  isEnglishFlow,
  isPortugueseFlow,
  onDocumentsAnalyzed,
  isLoading = false,
  onFileInputRef,
  onUploadLoadingChange,
  fileUploaded = false,
}: EnviarResumoBotComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");

  // Only show after step 3 (when user has chosen A or B)
  const shouldShow = currentStep >= 4 && userChoice;

  // Pass ref to parent so parent can use it
  useEffect(() => {
    if (fileInputRef && onFileInputRef) {
      onFileInputRef(fileInputRef);
    }
  }, [onFileInputRef]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }

    setUploadError("");
    setUploadLoading(true);
    if (onUploadLoadingChange) onUploadLoadingChange(true);

    try {
      // Convert file to base64
      const base64Data = await fileToBase64(file);

      // Create attachment object
      const attachment: FileAttachment = {
        id: generateAttachmentId(),
        type: validation.type || "pdf",
        fileName: file.name,
        base64Data,
        mimeType: file.type,
        size: file.size,
      };

      // Pass attachment to parent (no need to analyze anymore, just attach)
      onDocumentsAnalyzed([attachment]);
    } catch (err) {
      console.error("File processing error:", err);
      setUploadError(
        isPortugueseFlow
          ? "Erro ao processar o ficheiro"
          : "Error processing file"
      );
    } finally {
      setUploadLoading(false);
      if (onUploadLoadingChange) onUploadLoadingChange(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedFileTypes()}
        onChange={handleFileSelect}
        disabled={uploadLoading || isLoading}
        className="hidden"
        aria-label={isPortugueseFlow ? "Enviar ficheiro" : "Upload file"}
      />

      {!fileUploaded && (
        <div className="text-xs text-slate-500 italic">
          {isPortugueseFlow
            ? "💡 Dica: Clique no ícone de clipe para anexar um PDF ou imagem com a sua proposta ou ideia"
            : "💡 Tip: Click the clip icon to attach a PDF or image with your proposal or idea"}
        </div>
      )}

      {uploadError && (
        <div className="text-xs text-red-600">
          {uploadError}
        </div>
      )}
    </>
  );
}
