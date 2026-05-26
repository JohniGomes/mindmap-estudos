import os
import json
import re
import base64
from pathlib import Path

import anthropic
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Literal

app = FastAPI(title="Mapa Mental - Enfermagem")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """Você é um assistente especializado em criar materiais de estudo para estudantes de enfermagem.
Sua tarefa é analisar o conteúdo de PDFs de aulas e slides de enfermagem e produzir:

1. Um mapa mental detalhado em formato Markdown hierárquico (compatível com markmap)
2. Um resumo estruturado com os principais tópicos

REGRAS PARA O MAPA MENTAL:
- Use headings Markdown: # para o tópico central, ## para ramos principais, ### para sub-ramos, #### para detalhes
- Seja específico e use termos técnicos de enfermagem
- Inclua: definições, classificações, fisiopatologia, sinais/sintomas, diagnóstico, tratamento, cuidados de enfermagem
- Máximo 5 níveis de profundidade
- Linguagem clara e objetiva

REGRAS PARA O RESUMO:
- Identifique o tópico principal do material
- Liste de 5 a 10 pontos-chave clínicos mais importantes
- Organize por seções temáticas com bullet points
- Foque nos aspectos mais cobrados em provas

Retorne EXCLUSIVAMENTE um JSON válido no formato:
{
  "mindmap": "# Título\\n## Ramo 1\\n### Sub-ramo\\n...",
  "summary": {
    "main_topic": "Nome do tópico principal",
    "key_points": ["ponto 1", "ponto 2", ...],
    "sections": [
      {
        "title": "Título da seção",
        "points": ["ponto A", "ponto B", ...]
      }
    ]
  }
}"""

MAX_PDF_BYTES = 30 * 1024 * 1024  # 30 MB por PDF (limite da API Claude)


class ProcessResponse(BaseModel):
    mindmap: str
    summary: dict
    files_processed: list[str]


@app.post("/api/process", response_model=ProcessResponse)
async def process_pdfs(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY não configurada.")

    client = anthropic.Anthropic(api_key=api_key)

    # Monta os documentos para enviar ao Claude nativamente
    content_blocks: list = []
    processed_names = []

    for upload in files:
        if not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Arquivo '{upload.filename}' não é um PDF.")

        pdf_bytes = await upload.read()

        if len(pdf_bytes) > MAX_PDF_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"'{upload.filename}' é muito grande (máx 30 MB)."
            )

        pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")

        content_blocks.append({
            "type": "text",
            "text": f"Arquivo: {upload.filename}"
        })
        content_blocks.append({
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": pdf_b64,
            },
        })

        processed_names.append(upload.filename)

    content_blocks.append({
        "type": "text",
        "text": "Analise todos os documentos acima e gere o mapa mental e o resumo conforme instruído. Retorne apenas o JSON, sem texto antes ou depois."
    })

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content_blocks}],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Erro na API do Claude: {str(e)}")

    raw = response.content[0].text.strip()

    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Resposta da IA não é um JSON válido.")

    return ProcessResponse(
        mindmap=result["mindmap"],
        summary=result["summary"],
        files_processed=processed_names,
    )


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    message: str
    context: str
    history: list[ChatMessage] = []


@app.post("/api/chat")
async def chat(req: ChatRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY não configurada.")

    client = anthropic.Anthropic(api_key=api_key)

    system = f"""Você é um assistente especializado em enfermagem, ajudando uma estudante a entender o conteúdo das aulas.
Responda de forma clara, didática e objetiva. Use exemplos clínicos quando relevante.
Baseie suas respostas no seguinte conteúdo estudado:

{req.context}

Se a pergunta não estiver relacionada ao conteúdo, responda com base no seu conhecimento geral de enfermagem."""

    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            messages=messages,
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Erro na API do Claude: {str(e)}")

    return {"reply": response.content[0].text}


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve React build in production
static_dir = Path(__file__).parent.parent / "frontend" / "dist"
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        return FileResponse(str(static_dir / "index.html"))
