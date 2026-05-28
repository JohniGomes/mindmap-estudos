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
    summary: dict
    diagram: str
    files_processed: list[str]
    created_at: str


def _build_diagram_content(summary: dict) -> str:
    sections = summary.get("sections", [])
    sections_text = "\n".join(
        f'{s["title"]}:\n' + "\n".join(f'  - {p}' for p in s["points"])
        for s in sections
    )
    return (
        f'Tópico: {summary["main_topic"]}\n\n'
        f'Pontos-chave:\n' + "\n".join(f'- {p}' for p in summary.get("key_points", [])) +
        f'\n\nSeções:\n{sections_text}\n\nGere o infográfico SVG com base nesse conteúdo de enfermagem.'
    )


def _generate_diagram_svg(client: anthropic.Anthropic, summary: dict) -> str:
    """Gera o SVG do diagrama a partir do resumo. Retorna string vazia em caso de falha."""
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SVG_SYSTEM,
            messages=[{"role": "user", "content": _build_diagram_content(summary)}],
        )
        svg = resp.content[0].text.strip()
        if svg.startswith("```"):
            svg = re.sub(r"^```(?:svg|xml)?\s*", "", svg)
            svg = re.sub(r"\s*```$", "", svg.strip())
        return svg
    except Exception:
        return ""


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
            max_tokens=4096,
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

    # Gera diagrama SVG junto com o processamento
    diagram_svg = _generate_diagram_svg(client, result["summary"])

    # Salva no Supabase
    try:
        sb = get_supabase()
        row = sb.table("mindmaps").insert({
            "topic": result["summary"]["main_topic"],
            "mindmap": json.dumps(result["mindmap"], ensure_ascii=False),
            "summary": result["summary"],
            "diagram": diagram_svg,
            "files_processed": processed_names,
        }).execute()
        saved = row.data[0]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao salvar no banco: {str(e)}")

    return ProcessResponse(
        id=saved["id"],
        mindmap=result["mindmap"],
        summary=result["summary"],
        diagram=diagram_svg,
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
            if not row.get("diagram"):
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


SVG_SYSTEM = """Você é um designer especializado em infográficos médicos SVG profissionais.
Gere um SVG usando <foreignObject> para que o texto quebre linha corretamente dentro dos cards.

REGRAS OBRIGATÓRIAS:

1. DIMENSÕES: width="960". Calcule height com base no conteúdo (mínimo 600).

2. FUNDO geral: <rect width="960" height="TOTAL" fill="#f4f6f9" rx="0"/>

3. CABEÇALHO DO INFOGRÁFICO (topo, y=0, height=80, fill="#428072"):
   <rect width="960" height="80" fill="#428072"/>
   Título centralizado: <text x="480" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white">TÍTULO</text>

4. GRID DE CARDS: 2 colunas. Largura de cada coluna = 440px. Gap = 20px. Margem lateral = 20px.
   - Coluna 1: x=20
   - Coluna 2: x=480
   - Primeira linha de cards: y=100

5. CADA CARD usa <foreignObject> para texto com quebra de linha automática:
   Estrutura de um card (exemplo y=100, coluna 1):

   <!-- Card background -->
   <rect x="20" y="100" width="440" height="CARD_HEIGHT" rx="12" fill="COR_BG" stroke="COR_BORDA" stroke-width="1"/>

   <!-- Card header bar -->
   <rect x="20" y="100" width="440" height="44" rx="12" fill="COR_HEADER"/>
   <rect x="20" y="120" width="440" height="24" fill="COR_HEADER"/>

   <!-- Card header title -->
   <text x="44" y="128" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="white">TÍTULO DO CARD</text>

   <!-- Card body via foreignObject -->
   <foreignObject x="20" y="144" width="440" height="BODY_HEIGHT">
     <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:12px;color:#2e2e2e;padding:12px 16px;line-height:1.6">
       <p style="margin:0 0 6px 0;padding-left:14px;position:relative"><span style="position:absolute;left:0;color:COR_HEADER;font-weight:bold">•</span>Texto do item 1</p>
       <p style="margin:0 0 6px 0;padding-left:14px;position:relative"><span style="position:absolute;left:0;color:COR_HEADER;font-weight:bold">•</span>Texto do item 2</p>
     </div>
   </foreignObject>

6. CÁLCULO DE ALTURA DO CARD:
   - Estime 20px por linha de texto (textos longos ocupam 2 linhas = 40px)
   - BODY_HEIGHT = soma das alturas dos itens + 24px padding
   - CARD_HEIGHT = 44 (header) + BODY_HEIGHT + 8 (margem inferior)
   - Nunca truncar texto — o card deve ser alto o suficiente para todo conteúdo

7. POSICIONAMENTO DE CARDS EM PARES (mesma linha):
   - Cards na mesma linha devem ter a MESMA altura (use o maior dos dois)
   - Próxima linha começa em: y_anterior + max_height_da_linha + 20

8. SE NÚMERO ÍMPAR DE CARDS: último card ocupa largura total (x=20, width=920)

9. CORES POR CATEGORIA:
   Definição:      COR_HEADER=#5c7a9e  COR_BG=#eef2f8  COR_BORDA=#c5d4e8
   Fisiopatologia: COR_HEADER=#8b5c5c  COR_BG=#f8f0f0  COR_BORDA=#dfc5c5
   Sintomas:       COR_HEADER=#9e7a3a  COR_BG=#faf5ec  COR_BORDA=#e8d5b0
   Diagnóstico:    COR_HEADER=#3a6e9e  COR_BG=#eef4fa  COR_BORDA=#b8d0e8
   Tratamento:     COR_HEADER=#3a8a5c  COR_BG=#eef8f2  COR_BORDA=#b0dcc3
   Enfermagem:     COR_HEADER=#9e3a6e  COR_BG=#f8eef4  COR_BORDA=#ddb8cf
   Classificação:  COR_HEADER=#6e3a9e  COR_BG=#f4eef8  COR_BORDA=#c9b8de
   Epidemiologia:  COR_HEADER=#3a7a9e  COR_BG=#eef4f8  COR_BORDA=#b8d2e0

10. Retorne APENAS o SVG completo, sem markdown, sem explicação, sem ```"""


class DiagramRequest(BaseModel):
    topic: str
    key_points: list[str]
    sections: list[dict]


@app.post("/api/diagram")
async def generate_diagram(req: DiagramRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY não configurada.")

    client = anthropic.Anthropic(api_key=api_key)

    content = f"""Tópico: {req.topic}

Pontos-chave:
{chr(10).join(f'- {p}' for p in req.key_points)}

Seções:
{chr(10).join(f'{s["title"]}:{chr(10)}{chr(10).join(f"  - {p}" for p in s["points"])}' for s in req.sections)}

Gere o infográfico SVG com base nesse conteúdo de enfermagem."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SVG_SYSTEM,
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    svg = response.content[0].text.strip()
    # Remove markdown code fences if Claude added them
    if svg.startswith("```"):
        svg = re.sub(r"^```(?:svg|xml)?\s*", "", svg)
        svg = re.sub(r"\s*```$", "", svg.strip())

    from fastapi.responses import Response
    return Response(content=svg, media_type="image/svg+xml")


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

    system = [
        {
            "type": "text",
            "text": "Você é um assistente especializado em enfermagem, ajudando uma estudante a entender o conteúdo das aulas.\nResponda de forma clara, didática e objetiva. Use exemplos clínicos quando relevante.\nBaseie suas respostas no seguinte conteúdo estudado:\n\n",
        },
        {
            "type": "text",
            "text": req.context,
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": "\n\nSe a pergunta não estiver relacionada ao conteúdo, responda com base no seu conhecimento geral de enfermagem.",
        },
    ]

    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    try:
        response = client.messages.create(
            model="claude-haiku-4-5",
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
