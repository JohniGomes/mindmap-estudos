import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function downloadElementAsPDF(
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
) {
  // Captura o elemento como imagem em alta resolução
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width

  // Se a imagem for maior que a página, divide em múltiplas páginas
  let yOffset = 0
  let remainingH = imgH

  while (remainingH > 0) {
    const sliceH = Math.min(remainingH, pageH)
    const srcY = ((imgH - remainingH) / imgH) * canvas.height
    const srcH = (sliceH / imgH) * canvas.height

    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = srcH
    const ctx = sliceCanvas.getContext('2d')!
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

    const sliceData = sliceCanvas.toDataURL('image/png')
    if (yOffset > 0) pdf.addPage()
    pdf.addImage(sliceData, 'PNG', 0, 0, imgW, sliceH)

    remainingH -= pageH
    yOffset += pageH
  }

  pdf.save(`${filename}.pdf`)
}
