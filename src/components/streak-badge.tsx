"use client";

import { FlameIcon } from "lucide-react";

import { useProgress } from "@/lib/progress/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function StreakBadge() {
  const { streak } = useProgress();

  if (streak === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold">
          <FlameIcon className="size-3" />
          {streak}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {streak === 1
          ? "You studied today. Come back tomorrow to start a streak."
          : `${streak} days in a row.`}
      </TooltipContent>
    </Tooltip>
  );
}
