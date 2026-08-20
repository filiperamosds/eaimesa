"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

type Props = {
  venueName: string;
  tableLabel: string;
  claimUrl: string;
  expiresAt: string;
  onClose: () => void;
};

function secondsLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClaimQrModal({ venueName, tableLabel, claimUrl, expiresAt, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(() => secondsLeft(expiresAt));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, claimUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#161311", light: "#fffdf8" },
      errorCorrectionLevel: "M",
    }).catch(() => setError("Não foi possível gerar o QR."));
  }, [claimUrl]);

  useEffect(() => {
    const tick = () => setLeft(secondsLeft(expiresAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const expired = left <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-qr-title"
    >
      <div className="surface w-full max-w-md p-5">
        <p className="eyebrow">QR da comanda</p>
        <h2 id="claim-qr-title" className="mt-2 font-serif text-2xl">
          {tableLabel}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Cliente escaneia para abrir a comanda em <strong className="font-medium text-ink">{venueName}</strong>.
          Uso único — expira em{" "}
          <span className={expired ? "font-medium text-chili" : "font-medium text-ink"}>
            {expired ? "0:00" : formatCountdown(left)}
          </span>
          .
        </p>
        <div className="mt-5 flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className={`rounded-2xl border border-line bg-card ${expired ? "opacity-40" : ""}`}
          />
          {error ? <p className="mt-2 text-sm text-chili">{error}</p> : null}
          {expired ? (
            <p className="mt-3 text-sm font-medium text-chili">Código expirado — gere outro QR.</p>
          ) : (
            <p className="mt-3 break-all text-center text-xs text-ink-soft">
              {claimUrl.replace(/^https?:\/\//, "")}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="btn-primary !py-2 text-sm">
            {expired ? "Fechar" : "Pronto"}
          </button>
        </div>
      </div>
    </div>
  );
}
