import type { SummaryData } from '../App'
import { printHtml } from '../utils/printPdf'
import './Summary.css'

interface Props {
  data: SummaryData
  files: string[]
}

export default function Summary({ data, files }: Props) {
  function handleDownloadPDF() {
    const sectionsHtml = data.sections.map(s => `
      <div style="background:#f8f8f8;border:1px solid #e0e0e0;border-radius:10px;padding:14px;break-inside:avoid">
        <h4 style="font-size:10px;font-weight:700;color:#428072;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e0e0e0">${s.title}</h4>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:5px">
          ${s.points.map(p => `<li style="font-size:12px;color:#555;line-height:1.4;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:#428072;font-weight:700">›</span>${p}</li>`).join('')}
        </ul>
      </div>`).join('')

    const html = `
      <div style="max-width:800px;margin:0 auto">
        <h2 style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${data.main_topic}</h2>
        <p style="font-size:11px;color:#999;margin-bottom:20px">Baseado em: ${files.map(f => f.replace('.pdf', '')).join(', ')}</p>

        <div style="background:#f0faf8;border:1px solid #a8d8cf;border-radius:12px;padding:18px;margin-bottom:20px">
          <h3 style="font-size:10px;font-weight:700;color:#428072;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">⭐ Pontos-chave para a prova</h3>
          <ol style="padding-left:18px;display:flex;flex-direction:column;gap:8px">
            ${data.key_points.map(p => `<li style="font-size:13px;color:#1a1a1a;line-height:1.5">${p}</li>`).join('')}
          </ol>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          ${sectionsHtml}
        </div>
      </div>`

    printHtml(html, data.main_topic)
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
          <button className="summary-copy-btn" onClick={handleDownloadPDF}>
            ↓ Baixar PDF
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
