"use client";

import { useMemo } from "react";
import { create } from "qrcode";

/**
 * §34 — renderização vetorial do QR Code (paleta da marca: módulos em
 * `#0C0014` sobre `#F8FEFF`), sem depender de serviço externo.
 */
export function QrSvg({
  value,
  size = 132,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const qr = useMemo(() => {
    if (!value) return null;
    try {
      const code = create(value, { errorCorrectionLevel: "M" });
      const n = code.modules.size;
      const data = code.modules.data;
      let path = "";
      for (let row = 0; row < n; row += 1) {
        for (let col = 0; col < n; col += 1) {
          if (data[row * n + col]) path += `M${col} ${row}h1v1h-1z`;
        }
      }
      return { n, path };
    } catch {
      return null;
    }
  }, [value]);

  if (!qr || !qr.path) return null;

  const quiet = 2;
  const box = qr.n + quiet * 2;
  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR Code de ${value}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={box} height={box} fill="#F8FEFF" />
      <g transform={`translate(${quiet} ${quiet})`} fill="#0C0014">
        <path d={qr.path} />
      </g>
    </svg>
  );
}
