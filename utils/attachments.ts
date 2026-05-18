export type AttachmentType = "pdf" | "image";

export type FileAttachment = {
  id: string;
  type: AttachmentType;
  fileName: string;
  base64Data: string;
  mimeType: string;
  size: number; // in bytes
};

export type MessageWithAttachments = {
  role: "user" | "assistant";
  content: string;
  attachments?: FileAttachment[];
};

// File validation rules
const FILE_RULES = {
  pdf: {
    mimeTypes: ["application/pdf"],
    maxSizeMB: 10,
  },
  image: {
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    maxSizeMB: 50,
  },
};

export function validateFile(
  file: File
): { valid: boolean; error?: string; type?: AttachmentType } {
  // Check PDF
  if (FILE_RULES.pdf.mimeTypes.includes(file.type)) {
    if (file.size > FILE_RULES.pdf.maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: `PDF file size cannot exceed ${FILE_RULES.pdf.maxSizeMB}MB`,
      };
    }
    return { valid: true, type: "pdf" };
  }

  // Check Image
  if (FILE_RULES.image.mimeTypes.includes(file.type)) {
    if (file.size > FILE_RULES.image.maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: `Image file size cannot exceed ${FILE_RULES.image.maxSizeMB}MB`,
      };
    }
    return { valid: true, type: "image" };
  }

  return {
    valid: false,
    error: "File type not supported. Please upload a PDF or image (JPEG, PNG, GIF, WebP)",
  };
}

export function getAcceptedFileTypes(): string {
  return `${FILE_RULES.pdf.mimeTypes.join(
    ","
  )},${FILE_RULES.image.mimeTypes.join(",")}`;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64String = result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateAttachmentId(): string {
  return `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
