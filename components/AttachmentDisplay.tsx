"use client";
import { FileAttachment, formatFileSize } from "@/utils/attachments";

interface AttachmentDisplayProps {
  attachments: FileAttachment[];
  onRemove: (attachmentId: string) => void;
  isDisabled?: boolean;
}

export default function AttachmentDisplay({
  attachments,
  onRemove,
  isDisabled = false,
}: AttachmentDisplayProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-1 py-2 border-b border-slate-100 bg-slate-50">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
        >
          {/* ÍCONE DO TIPO DE FICHEIRO */}
          {attachment.type === "image" ? (
            <svg
              className="w-4 h-4 text-slate-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 3.414l4 4v10.586A2 2 0 0114 20H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {/* INFORMAÇÕES DO FICHEIRO */}
          <div className="flex-1 min-w-0">
            <div className="truncate text-slate-900 font-medium">
              {attachment.fileName}
            </div>
            <div className="text-slate-500 text-xs">
              {formatFileSize(attachment.size)}
            </div>
          </div>
          {/* BOTÃO DE REMOÇÃO */}
          <button
            onClick={() => onRemove(attachment.id)}
            disabled={isDisabled}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed ml-1 shrink-0"
            title="Remove attachment"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
