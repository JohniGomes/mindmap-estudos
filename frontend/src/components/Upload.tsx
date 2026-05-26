import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import './Upload.css'

interface Props {
  onFiles: (files: File[]) => void
  error: string | null
}

export default function Upload({ onFiles, error }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (files.length) addFiles(files)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files))
  }

  function addFiles(files: File[]) {
    setSelected(prev => {
      const names = new Set(prev.map(f => f.name))
      const unique = files.filter(f => !names.has(f.name))
      return [...prev, ...unique]
    })
  }

  function removeFile(name: string) {
    setSelected(prev => prev.filter(f => f.name !== name))
  }

  function handleSubmit() {
    if (selected.length > 0) onFiles(selected)
  }

  const totalSize = selected.reduce((sum, f) => sum + f.size, 0)
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(1)

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-hero">
          <div className="hero-icon">📚</div>
          <h2>Olá! Vamos criar seu mapa mental?</h2>
          <p>Faça upload dos PDFs das suas aulas e a IA vai gerar um mapa mental interativo e um resumo completo para você estudar.</p>
        </div>

        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          <div className="dropzone-icon">☁️</div>
          <p className="dropzone-title">Arraste seus PDFs aqui</p>
          <p className="dropzone-sub">ou clique para selecionar</p>
          <span className="dropzone-badge">Múltiplos arquivos suportados</span>
        </div>

        {selected.length > 0 && (
          <div className="file-list">
            <div className="file-list-header">
              <span>{selected.length} arquivo{selected.length > 1 ? 's' : ''} selecionado{selected.length > 1 ? 's' : ''}</span>
              <span className="file-size-total">{totalSizeMB} MB total</span>
            </div>
            {selected.map(f => (
              <div key={f.name} className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{f.name}</span>
                <span className="file-size">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button className="file-remove" onClick={e => { e.stopPropagation(); removeFile(f.name) }}>×</button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="error-box">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          className="btn-primary"
          disabled={selected.length === 0}
          onClick={handleSubmit}
        >
          ✨ Gerar Mapa Mental
        </button>
      </div>
    </div>
  )
}
