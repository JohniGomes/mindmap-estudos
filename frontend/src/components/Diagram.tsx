import { useState } from 'react'
import './Diagram.css'

interface Props {
  code: string
  topic: string
}

export default function Diagram({ code, topic }: Props) {
  const [zoom, setZoom] = useState(1)

  async function handleDownload() {
    const blob = new Blob([code], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${topic}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!code) {
    return (
      <div className="diagram-wrapper">
        <div className="diagram-empty">
          <p>Infográfico não disponível.</p>
          <span>Gere um novo mapa para ver o infográfico aqui.</span>
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
          <button onClick={() => setZoom(z => Math.min(z + 0.15, 2))}>+ Zoom</button>
          <button onClick={() => setZoom(1)}>Resetar</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))}>− Zoom</button>
          <button onClick={handleDownload}>Baixar SVG</button>
        </div>
      </div>

      <div className="diagram-scroll">
        <div
          className="diagram-canvas"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          dangerouslySetInnerHTML={{ __html: code }}
        />
      </div>
    </div>
  )
}
