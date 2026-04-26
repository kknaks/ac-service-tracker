import { Check, Lock } from "lucide-react";

export type SectionState = "current" | "done" | "locked";

export function SectionHeader({
  num,
  title,
  description,
  state,
}: {
  num: number;
  title: string;
  description?: string;
  state: SectionState;
}) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b">
      <Badge num={num} state={state} />
      <div className="flex-1 min-w-0">
        <h2
          className={`text-base font-semibold tracking-tight ${
            state === "locked" ? "text-muted-foreground" : ""
          }`}
        >
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

function Badge({ num, state }: { num: number; state: SectionState }) {
  const base =
    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0";
  if (state === "done") {
    return (
      <span className={`${base} bg-emerald-500 text-white`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className={`${base} bg-foreground text-background`}>{num}</span>
    );
  }
  // locked
  return (
    <span
      className={`${base} border border-muted-foreground/40 text-muted-foreground bg-muted/40`}
    >
      <Lock className="h-3 w-3" />
    </span>
  );
}
