import type { Result } from '../App'
import './History.css'

interface Props {
  items: Result[]
  onLoad: (item: Result) => void
  onDelete: (id: string) => void
}

export default function History({ items, onLoad, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="history-page">
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M3 3h18v18H3zM9 9h6M9 12h6M9 15h4"/>
            </svg>
          </div>
          <p>Nenhum mapa mental criado ainda.</p>
          <span>Seus mapas aparecem aqui automaticamente.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="history-page">
      <div className="history-container">
        <div className="history-header">
          <h2>Histórico</h2>
          <span>{items.length} mapa{items.length > 1 ? 's' : ''}</span>
        </div>
        <div className="history-grid">
          {items.map(item => (
            <div key={item.id} className="history-card">
              <div className="history-card-top">
                <div className="history-dot" />
                <span className="history-date">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : ''}
                </span>
              </div>
              <h3 className="history-topic">{item.summary.main_topic}</h3>
              <p className="history-files">
                {item.files_processed.map(f => f.replace('.pdf', '')).join(', ')}
              </p>
              <div className="history-points">
                {item.summary.key_points.slice(0, 3).map((p, i) => (
                  <span key={i}>{p}</span>
                ))}
              </div>
              <div className="history-actions">
                <button className="btn-load" onClick={() => onLoad(item)}>Abrir</button>
                <button className="btn-delete" onClick={() => item.id && onDelete(item.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
