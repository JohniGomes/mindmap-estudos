import os
import io
import json
import re
from pathlib import Path

import anthropic
import pdfplumber
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

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

MAX_CHARS_PER_PDF = 80_000
MAX_TOTAL_CHARS = 150_000


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n\n".join(text_parts)


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

    all_texts = []
    processed_names = []

    for upload in files:
        if not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Arquivo '{upload.filename}' não é um PDF.")

        content = await upload.read()
        try:
            text = extract_text_from_pdf(content)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Erro ao processar '{upload.filename}': {str(e)}")

        if len(text) > MAX_CHARS_PER_PDF:
            text = text[:MAX_CHARS_PER_PDF] + "\n[... conteúdo truncado ...]"

        all_texts.append(f"=== ARQUIVO: {upload.filename} ===\n{text}")
        processed_names.append(upload.filename)

    combined = "\n\n".join(all_texts)
    if len(combined) > MAX_TOTAL_CHARS:
        combined = combined[:MAX_TOTAL_CHARS] + "\n[... conteúdo total truncado ...]"

    user_message = f"""Analise o seguinte conteúdo extraído de PDFs de aulas de enfermagem e gere o mapa mental e o resumo conforme instruído:

{combined}

Retorne apenas o JSON, sem texto antes ou depois."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Erro na API do Claude: {str(e)}")

    raw = response.content[0].text.strip()

    # Strip markdown code block if Claude wrapped it
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
