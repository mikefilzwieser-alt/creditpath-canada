import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { FONT_STACK } from "@/components/brochures/brochure-tokens";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-brochure-mont",
});

export const metadata: Metadata = {
  title: "Drive Ready | Credit Path Canada",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DriveReadyBrochureLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={montserrat.className} style={{ fontFamily: FONT_STACK }}>
      {children}
    </div>
  );
}
