import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function TicketQRCode({
  value,
  size = 96,
  darkColor = '#0f172a',
  lightColor = '#ffffff',
  className = '',
}) {
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    let isMounted = true
    const textToEncode = String(value || 'BK-00000')

    QRCode.toDataURL(
      textToEncode,
      {
        width: size,
        margin: 1,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && isMounted) {
          setQrUrl(url)
        }
      }
    )

    return () => {
      isMounted = false
    }
  }, [value, size, darkColor, lightColor])

  if (!qrUrl) {
    return (
      <div
        className={`ticket-qr-skeleton ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      src={qrUrl}
      alt={`Pass QR Code for ${value}`}
      className={`ticket-qr-img ${className}`}
      width={size}
      height={size}
      loading="lazy"
    />
  )
}
