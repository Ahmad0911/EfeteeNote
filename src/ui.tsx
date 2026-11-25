import { useEffect, type ReactNode } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full max-w-[560px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-xl text-[#5d6a63] hover:bg-ivory">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) => (
  <label className={`block ${className}`}><span className="label">{label}</span>{children}</label>
);

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-xl">{msg}</div>;
}
