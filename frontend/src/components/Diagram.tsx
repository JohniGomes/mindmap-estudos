import { useEffect, useState, useRef } from 'react'
import type { SummaryData } from '../App'
import './Diagram.css'

interface Props {
  summary: SummaryData
  savedSvg?: string
}

export default function Diagram({ summary, savedSvg }: Props) {
  const [svg, setSvg] = useState<string | null>(savedSvg || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  function autoFitZoom() {
    requestAnimationFrame(() => {
      const container = scrollRef.current
      if (!container) return
      const svgEl = container.querySelector('svg')
      if (!svgEl) return
      const svgWidth = parseFloat(svgEl.getAttribute('width') || '960')
      const available = container.clientWidth - 48
      if (available < svgWidth) setZoom(available / svgWidth)
    })
  }

  function fetchDiagram() {
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
      .then(data => {
        setSvg(data)
        autoFitZoom()
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (savedSvg) {
      setSvg(savedSvg)
      autoFitZoom()
    }
    // Se não há SVG salvo, não gera automaticamente — espera o usuário clicar
  }, [savedSvg])

  function handleDownloadPDF() {
    if (!svg) return
    const win = window.open('', '_blank', 'width=1000,height=800')
    if (!win) { alert('Permita pop-ups para baixar o PDF.'); return }
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>${summary.main_topic}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; padding: 20px; }
  h2 { font-size: 18px; color: #428072; margin-bottom: 16px; text-align: center; }
  .svg-wrap { display: flex; justify-content: center; }
  .svg-wrap svg { max-width: 100%; height: auto; border-radius: 10px; }
  @media print { @page { margin: 8mm; size: A4 landscape; } body { padding: 0; } }
</style></head>
<body>
  <h2>${summary.main_topic}</h2>
  <div class="svg-wrap">${svg}</div>
  <script>window.addEventListener('load', () => { window.focus(); window.print(); })<\/script>
</body></html>`)
    win.document.close()
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
            <button className="diagram-retry" onClick={fetchDiagram}>
              Tentar novamente
            </button>
          </div>
        )}
        {!svg && !loading && !error && (
          <div className="diagram-empty">
            <p>Infográfico não gerado ainda.</p>
            <span>Este item foi criado antes da geração automática.</span>
            <button className="diagram-retry" onClick={fetchDiagram}>
              ✦ Gerar agora
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
