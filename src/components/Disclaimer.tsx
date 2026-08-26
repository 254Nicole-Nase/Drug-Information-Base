import { ShieldAlert } from "lucide-react";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground/80 ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/25 text-warning-foreground">
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="leading-relaxed">
        <span className="font-semibold text-foreground">Educational use only.</span> This
        tool reproduces published regulatory drug labelling. It is not medical advice, not a
        diagnosis, and not a dosing recommendation. Always consult a licensed pharmacist or
        clinician.
      </p>
    </div>
  );
}
