# Como Rodar o Mapa Mental

## Rodar localmente (desenvolvimento)

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
set ANTHROPIC_API_KEY=sk-ant-SUA_CHAVE_AQUI
uvicorn main:app --reload
```

### 2. Frontend (em outro terminal)
```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## Deploy no Railway (web app hospedado)

1. Crie conta em https://railway.app
2. Instale o CLI: `npm install -g @railway/cli`
3. Na pasta do projeto:
```bash
railway login
railway init
railway up
```
4. No painel do Railway → seu projeto → Variables → adicione:
   - `ANTHROPIC_API_KEY` = sua chave da API

5. Pronto! O Railway vai gerar uma URL pública.

---

## Estrutura do projeto
```
mindmap-estudos/
├── backend/
│   ├── main.py          # API FastAPI + integração Claude
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx
│       └── components/
│           ├── Upload.tsx   # Tela de upload
│           ├── MindMap.tsx  # Mapa mental interativo
│           └── Summary.tsx  # Resumo estruturado
└── railway.toml         # Config de deploy
```
