import { useEffect, useState, useRef } from 'react'
import type { SummaryData } from '../App'
import { printHtml } from '../utils/printPdf'
import './Diagram.css'

interface Props {
  summary: SummaryData
}

export default function Diagram({ summary }: Props) {
  const [svg, setSvg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
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
      .then(svg => {
        setSvg(svg)
        // auto-fit zoom to container width on mobile
        requestAnimationFrame(() => {
          const container = scrollRef.current
          if (!container) return
          const svgEl = container.querySelector('svg')
          if (!svgEl) return
          const svgWidth = parseFloat(svgEl.getAttribute('width') || '900')
          const available = container.clientWidth - 48
          if (available < svgWidth) setZoom(available / svgWidth)
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleDownloadPDF() {
    if (!svg) return
    const encoded = btoa(unescape(encodeURIComponent(svg)))
    const html = `
      <div style="text-align:center">
        <h2 style="font-size:18px;font-weight:700;color:#428072;margin-bottom:16px">${summary.main_topic}</h2>
        <img src="data:image/svg+xml;base64,${encoded}" style="max-width:100%;height:auto;border-radius:10px"/>
      </div>`
    printHtml(html, summary.main_topic)
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
              <button onClick={handleDownloadPDF}>Baixar PDF</button>
            </>
          )}
        </div>
      </div>

      <div className="diagram-scroll" ref={scrollRef}>
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
