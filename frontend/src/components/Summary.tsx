import type { SummaryData } from '../App'
import './Summary.css'

interface Props {
  data: SummaryData
  files: string[]
}

export default function Summary({ data, files }: Props) {
  async function handleCopy() {
    const lines: string[] = []
    lines.push(`# ${data.main_topic}`)
    lines.push('')
    lines.push('## Pontos-chave')
    data.key_points.forEach(p => lines.push(`• ${p}`))
    lines.push('')
    data.sections.forEach(s => {
      lines.push(`## ${s.title}`)
      s.points.forEach(p => lines.push(`• ${p}`))
      lines.push('')
    })
    await navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="summary-page">
      <div className="summary-container">
        <div className="summary-header">
          <div>
            <h2>{data.main_topic}</h2>
            <p className="summary-files">
              Baseado em: {files.map(f => f.replace('.pdf', '')).join(', ')}
            </p>
          </div>
          <button className="summary-copy-btn" onClick={handleCopy}>
            ⎘ Copiar resumo
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
