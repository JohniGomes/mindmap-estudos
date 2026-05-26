import { useState } from 'react'
import Upload from './components/Upload'
import MindMap from './components/MindMap'
import Summary from './components/Summary'
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
}

type View = 'mindmap' | 'summary'

export default function App() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('mindmap')

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setError(null)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🧠</span>
            <div>
              <h1>Mapa Mental</h1>
              <p>Estudos de Enfermagem</p>
            </div>
          </div>
          {result && (
            <div className="header-actions">
              <div className="view-toggle">
                <button
                  className={view === 'mindmap' ? 'active' : ''}
                  onClick={() => setView('mindmap')}
                >
                  🗺️ Mapa Mental
                </button>
                <button
                  className={view === 'summary' ? 'active' : ''}
                  onClick={() => setView('summary')}
                >
                  📋 Resumo
                </button>
              </div>
              <button className="btn-secondary" onClick={handleReset}>
                + Novo
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {!result && !loading && (
          <Upload onFiles={handleFiles} error={error} />
        )}

        {loading && (
          <div className="loading-screen">
            <div className="loading-card">
              <div className="spinner" />
              <h2>Analisando PDFs...</h2>
              <p>A IA está lendo o conteúdo e criando seu mapa mental.</p>
              <p className="loading-hint">Isso pode levar alguns segundos.</p>
            </div>
          </div>
        )}

        {result && view === 'mindmap' && (
          <MindMap markdown={result.mindmap} topic={result.summary.main_topic} />
        )}

        {result && view === 'summary' && (
          <Summary data={result.summary} files={result.files_processed} />
        )}
      </main>
    </div>
  )
}
