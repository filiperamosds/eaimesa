"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { publicMenuUrl } from "../lib/public-url";

type Props = {
  slug: string;
  venueName: string;
  /** Rótulo impresso no adesivo (ex. Mesa 4). URL continua só o cardápio. */
  tableLabel?: string;
  onClose: () => void;
};

function slugifyFile(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function MenuQrModal({ slug, venueName, tableLabel, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const target = publicMenuUrl(slug);
    setUrl(target);
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, target, {
      width: 280,
      margin: 2,
      color: { dark: "#161311", light: "#fffdf8" },
      errorCorrectionLevel: "M",
    }).catch(() => setError("Não foi possível gerar o QR."));
  }, [slug]);

  async function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const card = document.createElement("canvas");
    const w = 480;
    const h = tableLabel ? 640 : 580;
    card.width = w;
    card.height = h;
    const ctx = card.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#161311";
    ctx.font = "600 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(venueName, w / 2, 48);

    if (tableLabel) {
      ctx.fillStyle = "#e23c14";
      ctx.font = "600 36px Georgia, serif";
      ctx.fillText(tableLabel, w / 2, 100);
    }

    const qrSize = 280;
    const qrX = (w - qrSize) / 2;
    const qrY = tableLabel ? 130 : 80;
    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = "#6a5c51";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("Cardápio · só leitura", w / 2, qrY + qrSize + 36);
    ctx.fillText("Comanda: peça o QR do garçom", w / 2, qrY + qrSize + 58);

    ctx.fillStyle = "#161311";
    ctx.font = "12px system-ui, sans-serif";
    const short = url.replace(/^https?:\/\//, "");
    ctx.fillText(short, w / 2, h - 36);

    const a = document.createElement("a");
    const name = tableLabel
      ? `eaimesa-${slugifyFile(slug)}-${slugifyFile(tableLabel)}.png`
      : `eaimesa-${slugifyFile(slug)}-cardapio.png`;
    a.download = name;
    a.href = card.toDataURL("image/png");
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-qr-title"
    >
      <div className="surface w-full max-w-md p-5">
        <p className="eyebrow">QR fixo</p>
        <h2 id="menu-qr-title" className="mt-2 font-serif text-2xl">
          {tableLabel ? tableLabel : "Cardápio do bar"}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Aponta para o cardápio público. <strong className="font-medium text-ink">Não abre comanda</strong> —
          pedir exige o QR do garçom.
        </p>
        <div className="mt-5 flex flex-col items-center">
          <canvas ref={canvasRef} className="rounded-2xl border border-line bg-card" />
          {error ? <p className="mt-2 text-sm text-chili">{error}</p> : null}
          {url ? (
            <p className="mt-3 break-all text-center text-xs text-ink-soft">{url.replace(/^https?:\/\//, "")}</p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Fechar
          </button>
          <button type="button" onClick={() => void downloadPng()} className="btn-primary !py-2 text-sm">
            Exportar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
