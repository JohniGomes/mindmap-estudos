import { memo } from 'react'
import { Handle, Position } from 'reactflow'

export type Category =
  | 'root' | 'definition' | 'pathophysiology' | 'symptoms'
  | 'diagnosis' | 'treatment' | 'nursing' | 'classification'
  | 'epidemiology' | 'detail'

const CONFIG: Record<Category, { color: string; bg: string; border: string; icon: string }> = {
  root: {
    color: '#428072', bg: '#f0faf8', border: '#428072',
    icon: '<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>',
  },
  definition: {
    color: '#5c7a9e', bg: '#f0f4fa', border: '#a0bcd8',
    icon: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  },
  pathophysiology: {
    color: '#8b5c5c', bg: '#faf0f0', border: '#d4a0a0',
    icon: '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>',
  },
  symptoms: {
    color: '#9e7a3a', bg: '#faf6f0', border: '#d4b880',
    icon: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  },
  diagnosis: {
    color: '#3a6e9e', bg: '#f0f5fa', border: '#80aad4',
    icon: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  },
  treatment: {
    color: '#3a8a5c', bg: '#f0faf4', border: '#80c4a0',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  },
  nursing: {
    color: '#9e3a6e', bg: '#faf0f5', border: '#d480aa',
    icon: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
  },
  classification: {
    color: '#6e3a9e', bg: '#f5f0fa', border: '#aa80d4',
    icon: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  },
  epidemiology: {
    color: '#3a7a9e', bg: '#f0f7fa', border: '#80bcd4',
    icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>',
  },
  detail: {
    color: '#6b7280', bg: '#f9fafb', border: '#d1d5db',
    icon: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>',
  },
}

function getConfig(category: string) {
  return CONFIG[category as Category] ?? CONFIG.detail
}

interface NodeData {
  label: string
  category: string
  isRoot?: boolean
}

function MindMapNode({ data }: { data: NodeData }) {
  const cfg = getConfig(data.category)
  const isRoot = data.category === 'root'

  return (
    <div
      className="mm-node"
      style={{
        background: cfg.bg,
        border: `${isRoot ? 2 : 1.5}px solid ${cfg.border}`,
        borderRadius: isRoot ? 14 : 10,
        padding: isRoot ? '10px 18px' : '7px 14px',
        minWidth: isRoot ? 160 : 120,
        maxWidth: isRoot ? 220 : 200,
        boxShadow: isRoot
          ? `0 4px 16px rgba(0,0,0,0.1), 0 0 0 4px ${cfg.border}22`
          : '0 2px 8px rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {!isRoot && (
        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={cfg.color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: cfg.icon }}
        />
      )}
      <span style={{
        fontSize: isRoot ? 13 : 11,
        fontWeight: isRoot ? 700 : 500,
        color: isRoot ? cfg.color : '#2e1f1f',
        lineHeight: 1.35,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {data.label}
      </span>
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 0, height: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 0, height: 0 }} />
    </div>
  )
}

export default memo(MindMapNode)
