import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import './Upload.css'

interface Props {
  onFiles: (files: File[]) => void
  error: string | null
}

const ALLOWED_EXTS = new Set([
  '.pdf', '.docx', '.doc', '.pptx', '.ppt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.txt', '.md',
])

const ACCEPT = [
  '.pdf', '.docx', '.doc', '.pptx', '.ppt',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.txt', '.md',
].join(',')

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return '📄'
  if (['docx', 'doc'].includes(ext)) return '📝'
  if (['pptx', 'ppt'].includes(ext)) return '📊'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️'
  return '📃'
}

function isAllowed(file: File) {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  return ALLOWED_EXTS.has(ext)
}

export default function Upload({ onFiles, error }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(isAllowed)
    if (files.length) addFiles(files)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files).filter(isAllowed))
  }

  function addFiles(files: File[]) {
    setSelected(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...files.filter(f => !names.has(f.name))]
    })
  }

  function removeFile(name: string) {
    setSelected(prev => prev.filter(f => f.name !== name))
  }

  const totalMB = (selected.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-hero">
          <div className="hero-photo-wrap">
            <img src="/thallyta.jpg" alt="Thallyta" className="hero-photo" />
            <div className="hero-photo-ring" />
          </div>
          <h2>Olá, Thallyta</h2>
          <p>Envie seus arquivos de aula e a IA vai criar um mapa mental interativo e um resumo completo para você estudar.</p>
        </div>

        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" multiple accept={ACCEPT} onChange={handleChange} style={{ display: 'none' }} />
          <div className="dropzone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p className="dropzone-title">Arraste seus arquivos aqui</p>
          <p className="dropzone-sub">ou clique para selecionar · múltiplos arquivos suportados</p>
          <div className="dropzone-formats">
            <span>PDF</span><span>Word</span><span>PowerPoint</span><span>JPG · PNG</span><span>TXT</span>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="file-list">
            <div className="file-list-header">
              <span>{selected.length} arquivo{selected.length > 1 ? 's' : ''}</span>
              <span>{totalMB} MB</span>
            </div>
            {selected.map(f => (
              <div key={f.name} className="file-item">
                <span className="file-type-icon">{getFileIcon(f.name)}</span>
                <span className="file-name">{f.name}</span>
                <span className="file-size">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button className="file-remove" onClick={e => { e.stopPropagation(); removeFile(f.name) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        <button className="btn-primary" disabled={selected.length === 0} onClick={() => onFiles(selected)}>
          Gerar Mapa Mental
        </button>
      </div>
    </div>
  )
}
