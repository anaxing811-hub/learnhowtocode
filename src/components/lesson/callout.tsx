import {
  AlertTriangleIcon,
  BugIcon,
  InfoIcon,
  LightbulbIcon,
  TargetIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type CalloutKind = "note" | "tip" | "warning" | "gotcha" | "goal";

const STYLES: Record<
  CalloutKind,
  { icon: typeof InfoIcon; className: string; label: string }
> = {
  note: {
    icon: InfoIcon,
    className: "border-sky-500/30 bg-sky-500/5 text-sky-900 dark:text-sky-200",
    label: "Note",
  },
  tip: {
    icon: LightbulbIcon,
    className:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200",
    label: "Tip",
  },
  warning: {
    icon: AlertTriangleIcon,
    className:
      "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200",
    label: "Watch out",
  },
  gotcha: {
    icon: BugIcon,
    className:
      "border-rose-500/30 bg-rose-500/5 text-rose-900 dark:text-rose-200",
    label: "Common mistake",
  },
  goal: {
    icon: TargetIcon,
    className: "border-primary/30 bg-primary/5",
    label: "Goal",
  },
};

export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: CalloutKind;
  title?: string;
  children: React.ReactNode;
}) {
  const { icon: Icon, className, label } = STYLES[type];

  return (
    <div className={cn("my-5 rounded-lg border p-4 text-sm", className)}>
      <div className="mb-1.5 flex items-center gap-2 font-semibold">
        <Icon className="size-4 shrink-0" />
        {title ?? label}
      </div>
      <div className="[&>*+*]:mt-2 [&_code]:font-mono [&_code]:text-[0.9em]">
        {children}
      </div>
    </div>
  );
}

export function KeyPoints({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 my-6 rounded-lg border p-4">
      <div className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
        Worth remembering
      </div>
      <div className="lesson-prose text-sm [&_ul]:ml-4 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
