export function printHtml(html: string, title: string) {
  const win = window.open('', '_blank', 'width=960,height=700')
  if (!win) {
    alert('Permita pop-ups para baixar o PDF.')
    return
  }
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 24px; }
  @media print {
    @page { margin: 12mm; size: A4; }
    body { padding: 0; }
  }
</style>
</head>
<body>${html}</body>
</html>`)
  win.document.close()
  win.addEventListener('load', () => {
    win.focus()
    win.print()
  })
}
