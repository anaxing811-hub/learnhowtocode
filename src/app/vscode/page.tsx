import type { Metadata } from "next";

import { getProblemStats } from "@/lib/problems";
import { VsCodeGuide } from "@/components/vscode-guide";

export const metadata: Metadata = {
  title: "VS Code extension",
  description:
    "Read the lessons and solve the graded problem sets inside VS Code, against your own local compiler.",
};

export default function VsCodePage() {
  return <VsCodeGuide problemCount={getProblemStats().total} />;
}
