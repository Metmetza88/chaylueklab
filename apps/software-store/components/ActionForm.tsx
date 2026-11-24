"use client";
import { useActionState } from "react";
import type { State } from "@/app/actions";
export default function ActionForm({
  action,
  children,
  label = "บันทึก",
  className = "stack",
}: {
  action: (state: State, data: FormData) => Promise<State>;
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  return (
    <form action={dispatch} className={className}>
      {children}
      <button className="btn" disabled={pending}>
        {pending ? "กำลังดำเนินการ…" : label}
      </button>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
