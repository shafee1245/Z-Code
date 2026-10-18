'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeCanvasProps {
  value: string
  fillColor: string
  backColor: string
  size?: number
}

export default function QRCodeCanvas({
  value,
  fillColor,
  backColor,
  size = 280
}: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        color: {
          dark: fillColor,
          light: backColor
        },
        errorCorrectionLevel: 'M'
      },
      (error) => {
        if (error) console.error('Error generating QR code:', error)
      }
    )
  }, [value, fillColor, backColor, size])

  return (
    <div className="flex items-center justify-center p-6 bg-white rounded-xl shadow-lg">
      <canvas ref={canvasRef} className="rounded-lg" />
    </div>
  )
}
