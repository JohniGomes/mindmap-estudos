import { useEffect, useRef, useState } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import type { INode } from 'markmap-common'
import './MindMap.css'

interface Props {
  markdown: string
  topic: string
}

const transformer = new Transformer()

export default function MindMap({ markdown, topic }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!svgRef.current) return

    const { root } = transformer.transform(markdown)

    if (mmRef.current) {
      mmRef.current.destroy()
    }

    mmRef.current = Markmap.create(svgRef.current, {
      color: (node: INode) => {
        const colors = [
          '#ec4899', '#8b5cf6', '#3b82f6',
          '#10b981', '#f59e0b', '#ef4444',
          '#06b6d4', '#84cc16',
        ]
        return colors[(node.state?.depth ?? 0) % colors.length]
      },
      duration: 400,
      maxWidth: 280,
      paddingX: 16,
    }, root)

    return () => {
      mmRef.current?.destroy()
    }
  }, [markdown])

  function handleFit() {
    mmRef.current?.fit()
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mindmap-wrapper">
      <div className="mindmap-toolbar">
        <div className="mindmap-topic">
          <span className="mindmap-dot" />
          <span>{topic}</span>
        </div>
        <div className="mindmap-actions">
          <button onClick={handleFit} title="Centralizar mapa">⊡ Centralizar</button>
          <button onClick={handleCopy} title="Copiar Markdown">
            {copied ? '✓ Copiado!' : '⎘ Copiar MD'}
          </button>
        </div>
      </div>
      <div className="mindmap-hint">
        Use o scroll para zoom · Arraste para mover · Clique nos nós para expandir/recolher
      </div>
      <div className="mindmap-canvas">
        <svg ref={svgRef} className="mindmap-svg" />
      </div>
    </div>
  )
}
