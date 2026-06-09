import { useRef, useState } from 'react'
import type { SummaryData } from '../App'
import { downloadScrollableAsPDF } from '../utils/downloadPdf'
import './Summary.css'

interface Props {
  data: SummaryData
  files: string[]
}

export default function Summary({ data, files }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleDownloadPDF() {
    if (!containerRef.current) return
    setPdfLoading(true)
    try {
      await downloadScrollableAsPDF(containerRef.current, data.main_topic)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="summary-page">
      <div className="summary-container" ref={containerRef}>
        <div className="summary-header">
          <div>
            <h2>{data.main_topic}</h2>
            <p className="summary-files">
              Baseado em: {files.map(f => f.replace('.pdf', '')).join(', ')}
            </p>
          </div>
          <button className="summary-copy-btn" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? 'Gerando...' : '↓ Baixar PDF'}
          </button>
        </div>

        <div className="key-points-card">
          <h3>⭐ Pontos-chave para a prova</h3>
          <ol className="key-points-list">
            {data.key_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ol>
        </div>

        <div className="sections-grid">
          {data.sections.map((section, i) => (
            <div key={i} className="section-card">
              <h4>{section.title}</h4>
              <ul>
                {section.points.map((point, j) => (
                  <li key={j}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
