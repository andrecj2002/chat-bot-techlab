"use client";
import { useRef, useState, useEffect } from "react";

type EnviarResumoBotComponentProps = {
  currentStep: number;
  userChoice: "A" | "B" | null;
  isEnglishFlow: boolean;
  isPortugueseFlow: boolean;
  onDocumentAnalyzed: (analysis: string, fileName: string) => void;
  isLoading?: boolean;
  onFileInputRef?: (ref: React.MutableRefObject<HTMLInputElement | null>) => void;
  onUploadLoadingChange?: (isLoading: boolean) => void;
  pdfUploaded?: boolean;
};

export default function EnviarResumoBotComponent({
  currentStep,
  userChoice,
  isEnglishFlow,
  isPortugueseFlow,
  onDocumentAnalyzed,
  isLoading = false,
  onFileInputRef,
  onUploadLoadingChange,
  pdfUploaded = false,
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

    // Validate file type
    if (file.type !== "application/pdf") {
      setUploadError(isPortugueseFlow ? "Por favor, envie um ficheiro PDF" : "Please upload a PDF file");
      return;
    }

    // Validate file size (10MB max)
    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(
        isPortugueseFlow
          ? `O ficheiro não pode exceder ${maxSizeMB}MB`
          : `File size cannot exceed ${maxSizeMB}MB`
      );
      return;
    }

    setUploadError("");
    setUploadLoading(true);
    if (onUploadLoadingChange) onUploadLoadingChange(true);

    try {
      // Convert PDF to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64String = base64Data.split(",")[1]; // Remove data:application/pdf;base64, prefix

        try {
          // Send to analysis endpoint
          const response = await fetch("/api/analyze-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentBase64: base64String,
              fileName: file.name,
              userChoice,
              language: isEnglishFlow ? "en" : "pt",
            }),
          });

          if (!response.ok) {
            throw new Error(`API error ${response.status}`);
          }

          const data = await response.json();
          const analysis = data.analysis || "";

          if (analysis) {
            onDocumentAnalyzed(analysis, file.name);
          }
        } catch (err) {
          console.error("Document analysis error:", err);
          setUploadError(
            isPortugueseFlow
              ? "Erro ao analisar o documento. Tente novamente."
              : "Error analyzing document. Please try again."
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

      reader.onerror = () => {
        setUploadError(
          isPortugueseFlow ? "Erro ao ler o ficheiro" : "Error reading file"
        );
        setUploadLoading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File processing error:", err);
      setUploadError(
        isPortugueseFlow
          ? "Erro ao processar o ficheiro"
          : "Error processing file"
      );
      setUploadLoading(false);
      if (onUploadLoadingChange) onUploadLoadingChange(false);
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
        accept="application/pdf"
        onChange={handleFileSelect}
        disabled={uploadLoading || isLoading}
        className="hidden"
        aria-label={isPortugueseFlow ? "Enviar PDF" : "Upload PDF"}
      />

      {!pdfUploaded && (
        <div className="text-xs text-slate-500 italic">
          {isPortugueseFlow
            ? "💡 Dica: Clique no ícone de clipe para enviar um PDF com a sua proposta ou ideia"
            : "💡 Tip: Click the clip icon to attach a PDF with your proposal or idea"}
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
