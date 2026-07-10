import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BestilleHelikopter.no — Få tilbud på helikoptertransport",
  description:
    "Beskriv oppdraget ditt og motta et uforpliktende tilbud på helikoptertransport.",
  openGraph: {
    title: "BestilleHelikopter.no",
    description: "Få tilbud på helikoptertransport — enkelt og raskt.",
    locale: "nb_NO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
