"use client";
import { useActionState, startTransition, useEffect, useRef } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);
  return (
    <form
      ref={formRef}
      action={dispatch}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        // Dispatch manually so a validation error does not reset the user's fields.
        startTransition(() => dispatch(data));
      }}
    >
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
