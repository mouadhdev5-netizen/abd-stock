import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BarcodeViewerProps {
  value: string
  type: 'EAN13' | 'CODE128' | 'QR'
  title?: string
}

export function BarcodeViewer({ value, type, title }: BarcodeViewerProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!value) return

    if (type === 'QR' && qrRef.current) {
      QRCode.toCanvas(qrRef.current, value, {
        width: 150,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('Error generating QR code:', error)
      })
    } else if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: type,
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        })
      } catch (error) {
        console.error('Error generating Barcode:', error)
        // Fallback to CODE128 if EAN13 fails (EAN13 requires exactly 12 or 13 numeric chars)
        if (type === 'EAN13') {
          try {
            JsBarcode(barcodeRef.current, value, {
              format: 'CODE128',
              width: 2,
              height: 60,
              displayValue: true
            })
          } catch (e) {
            console.error('Fallback Barcode also failed', e)
          }
        }
      }
    }
  }, [value, type])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const content = type === 'QR' 
      ? `<canvas id="qr-canvas"></canvas>` 
      : `<svg id="barcode-svg"></svg>`
      
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${title || value}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .label { text-align: center; border: 1px dashed #ccc; padding: 20px; border-radius: 8px; }
            h2 { margin-top: 0; margin-bottom: 10px; font-size: 18px; }
            @media print {
              body { justify-content: flex-start; margin-top: 2cm; }
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${title ? `<h2>${title}</h2>` : ''}
            ${type === 'QR' 
                ? `<img src="${qrRef.current?.toDataURL()}" alt="QR" />` 
                : `<div id="svg-container"></div>`
            }
          </div>
          <script>
            if ('${type}' !== 'QR') {
              document.getElementById('svg-container').innerHTML = \`${barcodeRef.current?.outerHTML || ''}\`;
            }
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-white">
      {title && <div className="font-semibold text-sm mb-4 text-black">{title}</div>}
      
      <div className="bg-white p-2 mb-4">
        {type === 'QR' ? (
          <canvas ref={qrRef}></canvas>
        ) : (
          <svg ref={barcodeRef}></svg>
        )}
      </div>

      <Button variant="secondary" size="sm" onClick={handlePrint} className="w-full text-black border-black/20 hover:bg-slate-100">
        <Printer className="mr-2 h-4 w-4" />
        Print Label
      </Button>
    </div>
  )
}
