"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import { Message } from "@/utils/types";

interface GerarResumoBotComponentProps {
  messages: Message[];
  isPortugueseFlow: boolean;
}

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

function extractDataFromMessages(messages: Message[]): ExtractedData {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  const assistantMessages = messages.filter((m) => m.role === "assistant").map((m) => m.content);

  // Extract company name (usually first user message after language selection)
  let empresa = "";
  if (userMessages.length > 1) {
    empresa = userMessages[1] || "";
  }

  // Extract service type - look for A/B choice
  let servico = "";
  if (userMessages.length > 2) {
    const choice = userMessages[2]?.trim().toUpperCase();
    if (choice === "A") {
      servico = "Consultoria/Assessoria";
    } else if (choice === "B") {
      servico = "Brainstorming/Ideacao";
    }
  }

  // Extract context
  let contexto = "";
  for (let i = 3; i < userMessages.length; i++) {
    const msg = userMessages[i];
    if (assistantMessages[i - 1]) {
      const question = assistantMessages[i - 1];
      if (/contexto|context|background|situacao/i.test(question)) {
        contexto = msg;
        break;
      }
    }
  }

  // Extract timeline/deadline
  let prazoSolicitado = "";
  for (let i = 3; i < userMessages.length; i++) {
    const msg = userMessages[i];
    if (assistantMessages[i - 1]) {
      const question = assistantMessages[i - 1];
      if (/prazo|deadline|timing|when|quando/i.test(question)) {
        prazoSolicitado = msg;
        break;
      }
    }
  }

  // Extract specific requirements
  let requisitoEspecificos = "";
  for (let i = 3; i < userMessages.length; i++) {
    const msg = userMessages[i];
    if (assistantMessages[i - 1]) {
      const question = assistantMessages[i - 1];
      if (/requisito|requirement|especific|especifico|constraints|restricao/i.test(question)) {
        requisitoEspecificos = msg;
        break;
      }
    }
  }

  // Extract team information
  let equipa = "";
  for (let i = 3; i < userMessages.length; i++) {
    const msg = userMessages[i];
    if (assistantMessages[i - 1]) {
      const question = assistantMessages[i - 1];
      if (/equipa|team|recursos|resources|budget|orcamento|financ/i.test(question)) {
        equipa = msg;
        break;
      }
    }
  }

  // Extract financing information
  let financiamento = "";
  for (let i = 3; i < userMessages.length; i++) {
    const msg = userMessages[i];
    if (assistantMessages[i - 1]) {
      const question = assistantMessages[i - 1];
      if (/financ|budget|orcamento|investment|investimento/i.test(question)) {
        financiamento = msg;
        break;
      }
    }
  }

  // Extract contact information (usually last user message)
  let contacto = "";
  if (userMessages.length > 0) {
    contacto = userMessages[userMessages.length - 1] || "";
  }

  return {
    servico: servico || "Nao especificado",
    contexto: contexto || "Nao especificado",
    prazoSolicitado: prazoSolicitado || "Nao especificado",
    requisitoEspecificos: requisitoEspecificos || "Nao especificado",
    equipa: equipa || "Nao especificado",
    financiamento: financiamento || "Nao especificado",
    empresa: empresa || "Nao especificado",
    contacto: contacto || "Nao especificado",
  };
}

export default function GerarResumoBotComponent({ messages, isPortugueseFlow }: GerarResumoBotComponentProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      const data = extractDataFromMessages(messages);

      // Create PDF using jsPDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Set fonts
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("pci · creative science park tech lab", 105, 20, { align: "center" });

      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Resumo Gerado pelo Chat-bot", 105, 30, { align: "center" });

      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(`Pedido de ${data.empresa}`, 105, 38, { align: "center" });

      // Table data
      const rows = [
        { categoria: "Servico", descricao: data.servico },
        { categoria: "Contexto", descricao: data.contexto },
        { categoria: "Prazo Solicitado", descricao: data.prazoSolicitado },
        { categoria: "Requisitos Especificos", descricao: data.requisitoEspecificos },
        { categoria: "Equipa", descricao: data.equipa },
        { categoria: "Financiamento", descricao: data.financiamento },
        { categoria: "Contacto", descricao: data.contacto },
      ];

      // Table styling
      const startY = 50;
      const col1Width = 50;
      const col2Width = 130;
      const rowHeight = 30;
      let currentY = startY;

      // Header
      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Categoria", 15, currentY + 8);
      pdf.text("Descricao", 70, currentY + 8);
      pdf.line(15, currentY + 12, 200, currentY + 12);
      currentY += 20;

      // Rows
      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(9);
      rows.forEach((row) => {
        // Check if we need a new page
        if (currentY > 270) {
          pdf.addPage();
          currentY = 20;
        }

        // Category
        pdf.text(row.categoria, 15, currentY);

        // Description (with text wrapping)
        const descriptionLines = pdf.splitTextToSize(row.descricao, col2Width);
        pdf.text(descriptionLines, 70, currentY);

        // Calculate row height based on content
        const cellHeight = Math.max(10, descriptionLines.length * 6);
        currentY += cellHeight + 5;

        // Row separator
        pdf.line(15, currentY - 5, 200, currentY - 5);
      });

      // Save PDF
      pdf.save(`resumo_${data.empresa}.pdf`);
      setIsGenerating(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(isPortugueseFlow ? "Erro ao gerar o PDF" : "Error generating PDF");
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {isGenerating ? (isPortugueseFlow ? "A gerar..." : "Generating...") : (isPortugueseFlow ? "Descarregar resumo" : "Download summary")}
    </button>
  );
}
