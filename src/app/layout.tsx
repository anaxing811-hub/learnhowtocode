import type { Metadata, Viewport } from "next";
import { Roboto_Slab, Merriweather, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ProgressProvider } from "@/lib/progress/store";
import { SiteHeader } from "@/components/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "learnhowtocode — C++, Arduino, Python and React",
    template: "%s · learnhowtocode",
  },
  description:
    "Learn C++, Arduino, Python (with NumPy, pandas and scikit-learn) and React. Every example compiles and runs in your browser, with graded problem sets from beginner to olympiad level.",
  applicationName: "learnhowtocode",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1319" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${robotoSlab.variable} ${merriweather.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ProgressProvider>
              <SiteHeader />
              <main className="flex-1">{children}</main>
            </ProgressProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
