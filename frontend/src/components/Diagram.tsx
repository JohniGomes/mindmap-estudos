import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import './Diagram.css'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#f0faf8',
    primaryTextColor: '#2e1f1f',
    primaryBorderColor: '#428072',
    lineColor: '#428072',
    secondaryColor: '#f5f0fa',
    tertiaryColor: '#faf0f0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: '13px',
  },
  flowchart: { curve: 'basis', padding: 20 },
  securityLevel: 'loose',
})

interface Props {
  code: string
  topic: string
}

let diagramCounter = 0

export default function Diagram({ code, topic }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!code || !containerRef.current) return
    setError(null)
    diagramCounter++
    const id = `mermaid-${diagramCounter}`

    mermaid.render(id, code)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          const svgEl = containerRef.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.width = '100%'
            svgEl.style.height = 'auto'
            svgEl.style.maxWidth = '100%'
          }
        }
      })
      .catch(err => {
        setError('Não foi possível renderizar o diagrama.')
        console.error(err)
      })
  }, [code])

  if (!code) {
    return (
      <div className="diagram-wrapper">
        <div className="diagram-empty">
          <p>Diagrama não disponível para este mapa.</p>
          <span>Gere um novo mapa para ver o diagrama aqui.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="diagram-wrapper">
      <div className="diagram-toolbar">
        <div className="diagram-topic">
          <div className="diagram-dot" />
          <span>{topic}</span>
        </div>
        <div className="diagram-actions">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))}>+ Zoom</button>
          <button onClick={() => setZoom(1)}>100%</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))}>− Zoom</button>
        </div>
      </div>

      <div className="diagram-scroll">
        {error ? (
          <div className="diagram-error">{error}</div>
        ) : (
          <div
            className="diagram-canvas"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            ref={containerRef}
          />
        )}
      </div>
    </div>
  )
}
