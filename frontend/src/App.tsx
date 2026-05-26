import { useState, useEffect } from 'react'
import Upload from './components/Upload'
import MindMap, { MindMapNodeData } from './components/MindMap'
import Summary from './components/Summary'
import Diagram from './components/Diagram'
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
  id: string
  mindmap: MindMapNodeData
  diagram: string
  summary: SummaryData
  files_processed: string[]
  created_at?: string
}

type View = 'mindmap' | 'diagram' | 'summary' | 'history'

export default function App() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('mindmap')
  const [history, setHistory] = useState<Result[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function fetchHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/history')
      if (res.ok) setHistory(await res.json())
    } catch { /* silently ignore */ }
    finally { setHistoryLoading(false) }
  }

  useEffect(() => { fetchHistory() }, [])

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
      setResult(data)
      setView('mindmap')
      fetchHistory()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/history/${id}`, { method: 'DELETE' })
    setHistory(prev => prev.filter(h => h.id !== id))
  }

  function handleLoadFromHistory(item: Result) {
    setResult(item)
    setView('mindmap')
  }

  function handleReset() {
    setResult(null)
    setError(null)
    setView('mindmap')
  }

  function flattenTree(node: MindMapNodeData, depth = 0): string {
    return ['  '.repeat(depth) + node.label, ...node.children.map(c => flattenTree(c, depth + 1))].join('\n')
  }

  const chatContext = result
    ? `Tópico: ${result.summary.main_topic}\n\nPontos-chave:\n${result.summary.key_points.map(p => `- ${p}`).join('\n')}\n\nSeções:\n${result.summary.sections.map(s => `${s.title}:\n${s.points.map(p => `  - ${p}`).join('\n')}`).join('\n\n')}\n\nMapa mental:\n${flattenTree(result.mindmap)}`
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
              {result && (
                <>
                  <button className={view === 'mindmap' ? 'active' : ''} onClick={() => setView('mindmap')}>
                    Mapa Mental
                  </button>
                  <button className={view === 'diagram' ? 'active' : ''} onClick={() => setView('diagram')}>
                    Diagrama
                  </button>
                  <button className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>
                    Resumo
                  </button>
                </>
              )}
              <button className={view === 'history' ? 'active' : ''} onClick={() => { setView('history'); fetchHistory() }}>
                Histórico {history.length > 0 && <span className="history-badge">{history.length}</span>}
              </button>
            </div>
            {result && (
              <button className="btn-new" onClick={handleReset}>+ Novo</button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {view === 'history' && (
          <History items={history} loading={historyLoading} onLoad={handleLoadFromHistory} onDelete={handleDelete} />
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
              {view === 'mindmap' && <MindMap tree={result.mindmap} topic={result.summary.main_topic} />}
              {view === 'diagram' && <Diagram code={result.diagram} topic={result.summary.main_topic} />}
              {view === 'summary' && <Summary data={result.summary} files={result.files_processed} />}
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
