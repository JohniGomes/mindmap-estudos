import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

async function elementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Clona o elemento sem transforms para captura fiel
  const clone = element.cloneNode(true) as HTMLElement
  clone.style.transform = 'none'
  clone.style.position = 'fixed'
  clone.style.top = '-9999px'
  clone.style.left = '-9999px'
  clone.style.width = element.scrollWidth + 'px'
  clone.style.height = element.scrollHeight + 'px'
  clone.style.overflow = 'visible'
  document.body.appendChild(clone)

  try {
    return await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    })
  } finally {
    document.body.removeChild(clone)
  }
}

function canvasToPDF(
  canvas: HTMLCanvasElement,
  filename: string,
  orientation: 'portrait' | 'landscape',
) {
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  // Escala para caber na largura da página com margem
  const margin = 8
  const availW = pageW - margin * 2
  const availH = pageH - margin * 2
  const ratio = canvas.width / canvas.height

  let imgW = availW
  let imgH = imgW / ratio

  // Se for mais alto que a página, escala pela altura
  if (imgH > availH) {
    imgH = availH
    imgW = imgH * ratio
  }

  // Centraliza na página
  const x = (pageW - imgW) / 2
  const y = (pageH - imgH) / 2

  const imgData = canvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', x, y, imgW, imgH)
  pdf.save(`${filename}.pdf`)
}

export async function downloadElementAsPDF(
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
) {
  const canvas = await elementToCanvas(element)
  canvasToPDF(canvas, filename, orientation)
}

/** Para o Resumo: pode ter múltiplas páginas pois é vertical */
export async function downloadScrollableAsPDF(
  element: HTMLElement,
  filename: string,
) {
  const canvas = await elementToCanvas(element)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 8

  const availW = pageW - margin * 2
  const imgW = availW
  const totalImgH = (canvas.height * imgW) / canvas.width
  const pageImgH = pageH - margin * 2

  let remainingH = totalImgH
  let srcYRatio = 0

  while (remainingH > 0) {
    const sliceH = Math.min(remainingH, pageImgH)
    const srcY = srcYRatio * canvas.height
    const srcH = (sliceH / totalImgH) * canvas.height

    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = Math.ceil(srcH)
    const ctx = sliceCanvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

    if (srcYRatio > 0) pdf.addPage()
    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, sliceH)

    srcYRatio += sliceH / totalImgH
    remainingH -= pageImgH
  }

  pdf.save(`${filename}.pdf`)
}
