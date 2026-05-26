# chat-bot - TechLab

Chatbot para suporte de serviços do TechLab (PCI - Parque de Ciência e Inovação de Aveiro) com dois fluxos de conversa: Rota A (Conhecer Serviços) e Rota B (Explorar Ideias). Usa Claude Haiku 4.5, suporta Português e Inglês.

## Funcionalidades

- Dois fluxos de conversa diferentes
- Disponivel em PT-PT e em Inglês;
- Gera PDFs com resumo da conversa
- Envio direto de PDFs por email
- Guardar e carregar conversas anteriores
- Anexar documentos às conversas

## Componentes

- **ConfigBotComponent.tsx** - Interface do chat, progressão de passos, formatação de mensagens
- **GerarResumoBotComponent.tsx** - Gera PDFs com dados da conversa
- **EnviarResumoBotComponent.tsx** - Upload de ficheiros e envio por email
- **cacheOldChatsBotComponent.tsx** - Histórico de conversas
- **AttachmentDisplay.tsx** - Mostra ficheiros anexados

## Quick start

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Setup de email

Usa Mailgun para envio de emails. Configura `.env.local`:

```env

```

Ver [documentação Mailgun](https://documentation.mailgun.com) para detalhes de configuração.

## APIs

**POST /api/chat** (`app/api/chat/route.ts`)

- Processa mensagens de utilizador com Claude Haiku 4.5
- Detecta idioma, prazos, logística e passa marcadores de progresso
- Retorna resposta do bot e marcador de passos

**POST /api/extract-data** (`app/api/extract-data/route.ts`)

- Extrai dados estruturados da conversa (empresa, serviço, contexto, prazos, requisitos, equipa)
- Recorre ao Claude para análise da conversa
- Retorna JSON com informações para o PDF

**POST /api/send-email** (`app/api/send-email/route.ts`)

- Envia PDF por email via Mailgun API
- Recebe PDF em base64, dados extraídos e idioma
- Gera HTML com detalhes e envia para o e-mail selecionado

## Fluxos

O utilizador pode escolher 2 rotas, das quais surgem os seguintes passos:
**Rota A (Conhecer Serviços)**

1. Idioma
2. Escolhe Rota A
3. Dados da empresa
4. Descreve o que precisa
5. Prazos/orçamento
6. Contacto
7. Gerar e Enviar PDF

**Rota B (Explorar Ideias)**

1. Idioma
2. Escolhe Rota B
3. Dados da empresa
4. Brainstorming (sem falar em prazos/orçamento)
   Aqui, o utilizador pode escolher se quer prosseguir com a ideia para o TechLab. Se esse for o caso, será remetido para os seguintes passos:
5. Prazos/orçamento (após aprovação)
6. Contacto
7. Gerar e Enviar PDF

## Stack

- Next.js 15+ com TypeScript
- Claude Haiku 4.5 (possibilidade de alteração)
- React hooks
- Tailwind CSS
- jsPDF
- Mailgun (envio de emails)

## Contacto

Email: joaoajorge@ua.pt
