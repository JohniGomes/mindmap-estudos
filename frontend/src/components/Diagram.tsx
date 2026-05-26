import { useEffect, useState } from 'react'
import type { SummaryData } from '../App'
import './Diagram.css'

interface Props {
  summary: SummaryData
}

export default function Diagram({ summary }: Props) {
  const [svg, setSvg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (svg || loading) return
    setLoading(true)
    setError(null)

    fetch('/api/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: summary.main_topic,
        key_points: summary.key_points,
        sections: summary.sections,
      }),
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Erro ${res.status}`)
        return res.text()
      })
      .then(setSvg)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDownload() {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${summary.main_topic}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="diagram-wrapper">
      <div className="diagram-toolbar">
        <div className="diagram-topic">
          <div className="diagram-dot" />
          <span>{summary.main_topic}</span>
        </div>
        <div className="diagram-actions">
          {svg && (
            <>
              <button onClick={() => setZoom(z => Math.min(z + 0.15, 2))}>+ Zoom</button>
              <button onClick={() => setZoom(1)}>Resetar</button>
              <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))}>− Zoom</button>
              <button onClick={handleDownload}>Baixar SVG</button>
            </>
          )}
        </div>
      </div>

      <div className="diagram-scroll">
        {loading && (
          <div className="diagram-empty">
            <div className="diagram-spinner" />
            <p>Gerando infográfico...</p>
            <span>Isso pode levar alguns segundos.</span>
          </div>
        )}
        {error && (
          <div className="diagram-empty">
            <p style={{ color: 'var(--red)' }}>Erro ao gerar infográfico.</p>
            <span>{error}</span>
            <button className="diagram-retry" onClick={() => { setSvg(null); setError(null) }}>
              Tentar novamente
            </button>
          </div>
        )}
        {svg && !loading && (
          <div
            className="diagram-canvas"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  )
}
