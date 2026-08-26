import { ShieldAlert } from "lucide-react";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground ${className}`}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <p>
        <span className="font-medium text-foreground">Educational use only.</span>{" "}
        This tool reproduces published regulatory drug labelling. It is not medical
        advice, not a diagnosis, and not a dosing recommendation. Always consult a
        licensed pharmacist or clinician.
      </p>
    </div>
  );
}
