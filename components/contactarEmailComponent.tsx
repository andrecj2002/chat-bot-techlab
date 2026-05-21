"use client";
import { useState } from "react";

interface ExtractedData {
  servico: string;
  contexto: string;
  prazoSolicitado: string;
  requisitoEspecificos: string;
  equipa: string;
  financiamento: string;
  empresa: string;
  contacto: string;
}

interface ContactarEmailComponentProps {
  pdfBase64?: string;
  pdfFileName?: string;
  isPortugueseFlow: boolean;
  extractedData?: ExtractedData;
  onEmailSent?: () => void;
  currentChatId?: string;
}

export default function ContactarEmailComponent({
  pdfBase64,
  pdfFileName = "document.pdf",
  isPortugueseFlow,
  extractedData,
  onEmailSent,
  currentChatId,
}: ContactarEmailComponentProps) {
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(true);
  const [alreadySent, setAlreadySent] = useState<boolean>(() => {
    if (!currentChatId || typeof window === "undefined") return false;

    try {
      return Boolean(window.localStorage.getItem(`emailSent_${currentChatId}`));
    } catch {
      return false;
    }
  });

  const handleSendEmail = async () => {
    if (alreadySent) {
      setError(isPortugueseFlow ? "O email já foi enviado para esta conversa." : "An email has already been sent for this conversation.");
      return;
    }
    if (!pdfBase64) {
      setError(
        isPortugueseFlow
          ? "Nenhum documento disponível para enviar"
          : "No document available to send"
      );
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfBase64,
          pdfFileName,
          extractedData,
          language: isPortugueseFlow ? "pt" : "en",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            (isPortugueseFlow ? "Erro ao enviar email" : "Failed to send email")
        );
      }

        // parse response JSON for previewUrl or other info
        const successData = await response.json().catch(() => ({}));
        if (successData.previewUrl) setPreviewUrl(successData.previewUrl);

        // Mark as sent (UI + storage) and notify parent
        setEmailSent(true);
        setShowConsent(false);
        try {
          if (currentChatId && typeof window !== "undefined") {
            window.localStorage.setItem(`emailSent_${currentChatId}`, "1");
            setAlreadySent(true);
          }
        } catch {}
        onEmailSent?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isPortugueseFlow
          ? "Erro desconhecido ao enviar email"
          : "Unknown error while sending email";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDismiss = () => {
    setShowConsent(false);
  };

  // Show consent to send email
  if (showConsent && pdfBase64) {
    return (
      <div className="rounded-3xl rounded-tl-md border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base leading-6 sm:leading-7 text-slate-900 shadow-sm">
        <div className="flex flex-col gap-3">
          <p className="font-medium">
            {isPortugueseFlow
              ? "Deseja enviar o documento para a Techlab?"
              : "Would you like to send the document to Techlab?"}
          </p>
          <p className="text-xs sm:text-sm text-slate-600">
            {isPortugueseFlow
              ? "O documento será enviado para techlab@ua.pt para análise."
              : "The document will be sent to techlab@ua.pt for analysis."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isPortugueseFlow ? "A enviar..." : "Sending..."}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {isPortugueseFlow ? "Sim, enviar" : "Yes, send"}
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isSending}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 text-sm font-medium rounded-lg hover:border-slate-900 hover:text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPortugueseFlow ? "Não, obrigado" : "No, thanks"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success message
  if (emailSent) {
    return (
      <div className="p-4 mb-4 text-sm text-green-800 rounded-md bg-green-100" role="alert">
        <div className="font-medium">
          {isPortugueseFlow ? "Email enviado com sucesso" : "Email sent successfully"}
        </div>
        {previewUrl && (
          <div className="mt-1 text-sm">
            {isPortugueseFlow ? (
              <a className="underline" href={previewUrl} target="_blank" rel="noreferrer">Visualizar Email</a>
            ) : (
              <a className="underline" href={previewUrl} target="_blank" rel="noreferrer">Preview Email</a>
            )}
          </div>
        )}
      </div>
    );
  }

  // If an email was already sent for this chat, show an info alert instead of consent
  if (alreadySent && pdfBase64) {
    return (
      <div className="p-4 mb-4 text-sm text-sky-800 rounded-md bg-sky-100" role="alert">
        <span className="font-medium">
          {isPortugueseFlow ? "Email já enviado" : "Email already sent"}!
        </span>
        <div className="mt-1 text-sm text-sky-700">
          {isPortugueseFlow
            ? "Um email já foi enviado para a Techlab nesta conversa."
            : "An email has already been sent to Techlab for this conversation."}
        </div>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="p-4 mb-4 text-sm text-red-800 rounded-md bg-red-100" role="alert">
        <div className="font-medium">{isPortugueseFlow ? "Erro ao enviar email" : "Error sending email"}</div>
        <div className="mt-1 text-sm">{error}</div>
        <div className="mt-2">
          <button
            onClick={() => {
              setError(null);
              setShowConsent(true);
            }}
            className="text-sm underline"
          >
            {isPortugueseFlow ? "Tentar novamente" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  // Don't render if no PDF
  return null;
}
