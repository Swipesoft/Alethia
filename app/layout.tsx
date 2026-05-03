import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Athena — The World's First ArchAgent for Education",
  description:
    "Athena is an autonomous meta-learning system that designs, adapts, and evolves your entire education journey — not just your next lesson.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
