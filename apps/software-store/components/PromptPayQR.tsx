"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function PromptPayQR({
  payload,
  amount,
}: {
  payload: string;
  amount: number;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(payload, { margin: 1, width: 240 })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [payload]);

  return (
    <div className="stack" style={{ justifyItems: "start" }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`QR PromptPay ยอด ${amount} บาท`}
          width={240}
          height={240}
          style={{ background: "#fff", borderRadius: 8 }}
        />
      ) : (
        <div className="muted">กำลังสร้าง QR…</div>
      )}
      <span className="muted">
        สแกนด้วยแอปธนาคาร ยอดชำระ ฿{amount.toLocaleString("th-TH")}{" "}
        (ระบบกรอกยอดให้แล้ว)
      </span>
    </div>
  );
}
