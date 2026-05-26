import { useEffect, useState, useCallback } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls,
  useNodesState, useEdgesState, ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import MindMapNode from './MindMapNode'
import './MindMap.css'

export interface MindMapNodeData {
  id: string
  label: string
  category: string
  children: MindMapNodeData[]
}

interface Props {
  tree: MindMapNodeData
  topic: string
}

const nodeTypes = { mindmapNode: MindMapNode }

const H_GAP = 270
const V_GAP = 72

function getSubtreeSize(node: MindMapNodeData): number {
  if (node.children.length === 0) return 1
  return node.children.reduce((s, c) => s + getSubtreeSize(c), 0)
}

function buildGraph(root: MindMapNodeData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  const COLORS: Record<string, string> = {
    root: '#428072', definition: '#5c7a9e', pathophysiology: '#8b5c5c',
    symptoms: '#9e7a3a', diagnosis: '#3a6e9e', treatment: '#3a8a5c',
    nursing: '#9e3a6e', classification: '#6e3a9e', epidemiology: '#3a7a9e',
    detail: '#9ca3af',
  }

  function place(node: MindMapNodeData, depth: number, yStart: number) {
    const size = getSubtreeSize(node)
    const y = yStart + (size * V_GAP) / 2
    nodes.push({
      id: node.id,
      type: 'mindmapNode',
      position: { x: depth * H_GAP, y: y - 20 },
      data: { label: node.label, category: node.category },
    })
    let childY = yStart
    for (const child of node.children) {
      const childSize = getSubtreeSize(child)
      const color = COLORS[child.category] ?? '#9ca3af'
      edges.push({
        id: `e-${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.55 },
      })
      place(child, depth + 1, childY)
      childY += childSize * V_GAP
    }
  }

  place(root, 0, 0)
  return { nodes, edges }
}

function MindMapInner({ tree, topic }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [rfInstance, setRfInstance] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(tree)
    setNodes(n)
    setEdges(e)
    setTimeout(() => rfInstance?.fitView({ padding: 0.15 }), 50)
  }, [tree])

  const onInit = useCallback((instance: any) => {
    setRfInstance(instance)
    setTimeout(() => instance.fitView({ padding: 0.15 }), 50)
  }, [])

  async function handleCopy() {
    const flatten = (n: MindMapNodeData, d = 0): string =>
      ['  '.repeat(d) + n.label, ...n.children.map(c => flatten(c, d + 1))].join('\n')
    await navigator.clipboard.writeText(flatten(tree))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mindmap-wrapper">
      <div className="mindmap-toolbar">
        <div className="mindmap-topic">
          <div className="mindmap-dot" />
          <span>{topic}</span>
        </div>
        <div className="mindmap-actions">
          <button onClick={() => rfInstance?.fitView({ padding: 0.15 })}>Centralizar</button>
          <button onClick={handleCopy}>{copied ? 'Copiado!' : 'Copiar'}</button>
        </div>
      </div>
      <div className="mindmap-hint">Scroll para zoom · Arraste para mover</div>
      <div className="mindmap-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e8e7f0" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="mindmap-legend">
        {[
          { cat: 'definition', label: 'Definição' },
          { cat: 'pathophysiology', label: 'Fisiopatologia' },
          { cat: 'symptoms', label: 'Sintomas' },
          { cat: 'diagnosis', label: 'Diagnóstico' },
          { cat: 'treatment', label: 'Tratamento' },
          { cat: 'nursing', label: 'Enfermagem' },
          { cat: 'classification', label: 'Classificação' },
          { cat: 'epidemiology', label: 'Epidemiologia' },
        ].map(({ cat, label }) => {
          const colors: Record<string, string> = {
            definition: '#5c7a9e', pathophysiology: '#8b5c5c', symptoms: '#9e7a3a',
            diagnosis: '#3a6e9e', treatment: '#3a8a5c', nursing: '#9e3a6e',
            classification: '#6e3a9e', epidemiology: '#3a7a9e',
          }
          return (
            <div key={cat} className="legend-item">
              <span className="legend-dot" style={{ background: colors[cat] }} />
              <span>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MindMap(props: Props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  )
}
