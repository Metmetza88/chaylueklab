"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Play } from "lucide-react";
import { useId, useRef, useState } from "react";
import LiveDemoBanner from "./LiveDemoBanner";
import { DialogTitle } from "./StoreDialogs";

function Loading() {
  return <p role="status">กำลังเปิดหน้าทดลอง…</p>;
}

const SportDemo = dynamic(() => import("./SportDemo"), {
  loading: Loading,
  ssr: false,
});
const AttendanceDemo = dynamic(() => import("./AttendanceDemo"), {
  loading: Loading,
  ssr: false,
});
const SchoolDemo = dynamic(() => import("./SchoolDemo"), {
  loading: Loading,
  ssr: false,
});
const VoteDemo = dynamic(() => import("./VoteDemo"), {
  loading: Loading,
  ssr: false,
});
const ModuleDashboard = dynamic(() => import("./ModuleDashboard"), {
  loading: Loading,
  ssr: false,
});

export default function LiveDemoTrigger({
  slug,
  name,
  tagline,
}: {
  slug: string;
  name: string;
  tagline: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn live-demo-button"
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Play size={15} aria-hidden="true" /> ทดลองใช้ตัวจริง (Live Demo)
      </button>
      <dialog
        className="market-dialog live-demo-modal"
        aria-labelledby={title}
        ref={dialog}
        onClose={() => setOpen(false)}
      >
        <DialogTitle id={title} title={`ทดลองใช้ ${name}`} />
        <p>ลองกรอกและกดใช้งานได้ด้วยข้อมูลสมมติ โดยไม่ต้องเข้าสู่ระบบ</p>
        <LiveDemoBanner name={name} slug={slug} />
        <Link href={`/demo/${slug}`} onClick={() => dialog.current?.close()}>
          เปิดเดโมเต็มหน้า
        </Link>
        {open &&
          (slug === "met-sport" ? (
            <SportDemo />
          ) : slug === "met-attendance" ? (
            <AttendanceDemo />
          ) : slug === "met-vote" ? (
            <VoteDemo />
          ) : slug === "met-admission" || slug === "met-school-pro" ? (
            <SchoolDemo product={slug} />
          ) : (
            <ModuleDashboard slug={slug} name={name} tagline={tagline} />
          ))}
      </dialog>
    </>
  );
}
