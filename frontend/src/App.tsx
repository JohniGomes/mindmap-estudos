import { useState, useEffect } from 'react'
import Upload from './components/Upload'
import MindMap from './components/MindMap'
import Summary from './components/Summary'
import History from './components/History'
import Chat from './components/Chat'
import './App.css'

export interface SummarySection {
  title: string
  points: string[]
}

export interface SummaryData {
  main_topic: string
  key_points: string[]
  sections: SummarySection[]
}

export interface Result {
  mindmap: string
  summary: SummaryData
  files_processed: string[]
  createdAt?: string
  id?: string
}

type View = 'mindmap' | 'summary' | 'history'

const HISTORY_KEY = 'mindmap_history'

function loadHistory(): Result[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function saveToHistory(result: Result) {
  const history = loadHistory()
  const entry = { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...history].slice(0, 20)))
}

export default function App() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('mindmap')
  const [history, setHistory] = useState<Result[]>(loadHistory)

  useEffect(() => {
    setHistory(loadHistory())
  }, [result])

  async function handleFiles(files: File[]) {
    setLoading(true)
    setError(null)
    setResult(null)

    const form = new FormData()
    files.forEach(f => form.append('files', f))

    try {
      const res = await fetch('/api/process', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Erro ${res.status}`)
      }
      const data: Result = await res.json()
      saveToHistory(data)
      setResult(data)
      setView('mindmap')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setError(null)
    setView('mindmap')
  }

  function handleLoadFromHistory(item: Result) {
    setResult(item)
    setView('mindmap')
  }

  function handleDeleteFromHistory(id: string) {
    const updated = history.filter(h => h.id !== id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    setHistory(updated)
  }

  const chatContext = result
    ? `Tópico: ${result.summary.main_topic}\n\nPontos-chave:\n${result.summary.key_points.map(p => `- ${p}`).join('\n')}\n\nSeções:\n${result.summary.sections.map(s => `${s.title}:\n${s.points.map(p => `  - ${p}`).join('\n')}`).join('\n\n')}\n\nMapa mental:\n${result.mindmap}`
    : ''

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div>
              <h1>Mapa Mental</h1>
              <p>Estudos da Thallyta</p>
            </div>
          </div>

          <div className="header-actions">
            <div className="view-toggle">
              {result ? (
                <>
                  <button className={view === 'mindmap' ? 'active' : ''} onClick={() => setView('mindmap')}>
                    Mapa Mental
                  </button>
                  <button className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>
                    Resumo
                  </button>
                </>
              ) : null}
              <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>
                Histórico
              </button>
            </div>
            {result && (
              <button className="btn-new" onClick={handleReset}>+ Novo</button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {view === 'history' && !loading && (
          <History
            items={history}
            onLoad={handleLoadFromHistory}
            onDelete={handleDeleteFromHistory}
          />
        )}

        {view !== 'history' && !result && !loading && (
          <Upload onFiles={handleFiles} error={error} />
        )}

        {loading && (
          <div className="loading-screen">
            <div className="loading-card">
              <div className="spinner" />
              <h2>Analisando PDFs...</h2>
              <p>A IA está lendo e criando seu mapa mental.</p>
              <p className="loading-hint">Isso pode levar alguns segundos.</p>
            </div>
          </div>
        )}

        {result && view !== 'history' && (
          <div className="result-layout">
            <div className="result-main">
              {view === 'mindmap' && (
                <MindMap markdown={result.mindmap} topic={result.summary.main_topic} />
              )}
              {view === 'summary' && (
                <Summary data={result.summary} files={result.files_processed} />
              )}
            </div>
            <div className="chat-panel">
              <Chat context={chatContext} topic={result.summary.main_topic} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
