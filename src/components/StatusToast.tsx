import { useEffect } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { Status } from "../types";

export function StatusToast({ status, onClose }: { status: Status; onClose: () => void }) {
  useEffect(() => {
    if (!status.message || status.type === "loading") return;
    const timer = window.setTimeout(onClose, 5500);
    return () => window.clearTimeout(timer);
  }, [onClose, status.message, status.type]);

  if (!status.message) return null;

  return (
    <div className={`status-toast ${status.type}`} role="status" aria-live={status.type === "error" ? "assertive" : "polite"}>
      <div className="status-icon">
        {status.type === "loading" ? <Loader2 className="spin" size={18} /> : status.type === "success" ? <Check size={18} /> : <X size={18} />}
      </div>
      <div>
        <strong>{status.type === "error" ? "Action failed" : status.type === "success" ? "Action complete" : "Working"}</strong>
        <span>{status.message}</span>
      </div>
      {status.type !== "loading" && (
        <button type="button" onClick={onClose} aria-label="Close notification">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
