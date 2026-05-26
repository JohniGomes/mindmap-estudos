import os
import json
import re
import base64
from pathlib import Path
from functools import lru_cache

import anthropic
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Literal
from supabase import create_client, Client

app = FastAPI(title="Mapa Mental - Enfermagem")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL ou SUPABASE_KEY não configuradas.")
    return create_client(url, key)


SYSTEM_PROMPT = """Você é um assistente especializado em criar materiais de estudo para estudantes de enfermagem.
Analise o conteúdo de PDFs de aulas e slides e produza:

1. Um mapa mental como árvore JSON com categorias visuais
2. Um resumo estruturado com os principais tópicos

CATEGORIAS DISPONÍVEIS para cada nó:
- "root": tópico central (apenas o nó raiz)
- "definition": definição, conceito, introdução
- "pathophysiology": fisiopatologia, mecanismo, etiologia, causas
- "symptoms": sinais, sintomas, manifestações clínicas
- "diagnosis": diagnóstico, exames, critérios diagnósticos
- "treatment": tratamento, medicamentos, conduta terapêutica
- "nursing": cuidados de enfermagem, SAE, intervenções de enfermagem
- "classification": classificação, tipos, formas, estágios
- "epidemiology": epidemiologia, prevalência, fatores de risco
- "detail": detalhes, sub-itens, informações complementares

REGRAS DO DIAGRAMA MERMAID (campo "diagram"):
- Use flowchart TD (top-down) para visualizar o conteúdo como fluxo clínico
- Nós com texto conciso (máx 6 palavras), use colchetes: A[texto]
- Aplique as classes CSS acima conforme a categoria de cada nó
- Inclua setas com labels quando relevante: A -->|causa| B
- Máximo 25 nós para não ficar poluído
- Sempre termine com as linhas classDef

REGRAS DO MAPA MENTAL:
- Máximo 4 níveis de profundidade
- IDs únicos: "root", "n1", "n1-1", "n1-2", "n2", "n2-1", etc.
- Labels concisos (máx 8 palavras por nó)
- Atribua a categoria mais específica possível a cada nó
- Inclua todos os temas principais do material

REGRAS DO RESUMO:
- Identifique o tópico principal
- Liste de 5 a 10 pontos-chave clínicos
- Organize por seções temáticas
- Foque nos aspectos mais cobrados em provas

Retorne EXCLUSIVAMENTE um JSON válido no formato:
{
  "diagram": "flowchart TD\n    A[Tópico]:::root\n    A --> B[Ramo]:::def\n    ...\n    classDef root fill:#f0faf8,stroke:#428072,color:#2d6b5e,font-weight:bold\n    classDef def fill:#f0f4fa,stroke:#5c7a9e,color:#3d5a7a\n    classDef patho fill:#faf0f0,stroke:#8b5c5c,color:#6b3c3c\n    classDef symp fill:#faf6f0,stroke:#9e7a3a,color:#7a5a1a\n    classDef diag fill:#f0f5fa,stroke:#3a6e9e,color:#1a4e7a\n    classDef treat fill:#f0faf4,stroke:#3a8a5c,color:#1a6a3c\n    classDef nurs fill:#faf0f5,stroke:#9e3a6e,color:#7a1a4e\n    classDef class fill:#f5f0fa,stroke:#6e3a9e,color:#4e1a7a\n    classDef epi fill:#f0f7fa,stroke:#3a7a9e,color:#1a5a7a\n    classDef detail fill:#f9fafb,stroke:#d1d5db,color:#374151",
  "mindmap": {
    "id": "root",
    "label": "Nome do Tópico Principal",
    "category": "root",
    "children": [
      {
        "id": "n1",
        "label": "Nome do Ramo",
        "category": "definition",
        "children": [
          { "id": "n1-1", "label": "Detalhe", "category": "detail", "children": [] }
        ]
      }
    ]
  },
  "summary": {
    "main_topic": "Nome do tópico principal",
    "key_points": ["ponto 1", "ponto 2"],
    "sections": [
      { "title": "Título da seção", "points": ["ponto A", "ponto B"] }
    ]
  }
}"""

MAX_PDF_BYTES = 30 * 1024 * 1024


class ProcessResponse(BaseModel):
    id: str
    mindmap: dict
    diagram: str
    summary: dict
    files_processed: list[str]
    created_at: str


@app.post("/api/process", response_model=ProcessResponse)
async def process_pdfs(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY não configurada.")

    client = anthropic.Anthropic(api_key=api_key)
    content_blocks: list = []
    processed_names = []

    for upload in files:
        if not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Arquivo '{upload.filename}' não é um PDF.")

        pdf_bytes = await upload.read()
        if len(pdf_bytes) > MAX_PDF_BYTES:
            raise HTTPException(status_code=413, detail=f"'{upload.filename}' é muito grande (máx 30 MB).")

        pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
        content_blocks.append({"type": "text", "text": f"Arquivo: {upload.filename}"})
        content_blocks.append({
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64},
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

    # Salva no Supabase
    try:
        sb = get_supabase()
        row = sb.table("mindmaps").insert({
            "topic": result["summary"]["main_topic"],
            "mindmap": json.dumps(result["mindmap"], ensure_ascii=False),
            "diagram": result.get("diagram", ""),
            "summary": result["summary"],
            "files_processed": processed_names,
        }).execute()
        saved = row.data[0]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao salvar no banco: {str(e)}")

    return ProcessResponse(
        id=saved["id"],
        mindmap=result["mindmap"],
        diagram=result.get("diagram", ""),
        summary=result["summary"],
        files_processed=processed_names,
        created_at=saved["created_at"],
    )


@app.get("/api/history")
def get_history():
    try:
        sb = get_supabase()
        rows = sb.table("mindmaps").select("*").order("created_at", desc=True).limit(30).execute()
        # Desserializa mindmap de string para dict
        for row in rows.data:
            if isinstance(row.get("mindmap"), str):
                try:
                    row["mindmap"] = json.loads(row["mindmap"])
                except Exception:
                    row["mindmap"] = {"id": "root", "label": row.get("topic", ""), "category": "root", "children": []}
            if "diagram" not in row:
                row["diagram"] = ""
        return rows.data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao carregar histórico: {str(e)}")


@app.delete("/api/history/{item_id}")
def delete_history(item_id: str):
    try:
        sb = get_supabase()
        sb.table("mindmaps").delete().eq("id", item_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao deletar: {str(e)}")


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
        candidate = static_dir / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(static_dir / "index.html"))
