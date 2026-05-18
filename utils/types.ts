export type Message = {
  role: "user" | "assistant";
  content: string;
  attachments?: {
    id: string;
    type: "pdf" | "image";
    fileName: string;
    base64Data: string;
    mimeType: string;
    size: number;
  }[];
};
