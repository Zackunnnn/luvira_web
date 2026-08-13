import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Luvira Sock Brand | Modest • Comfortable • Chic",
  description: "Toko resmi Luvira Sock Brand. Kaos kaki jempol emboss, alas hitam anti noda, anti slip, dan classic full coverage berkualitas premium.",
  keywords: ["Luvira", "Kaos Kaki Modest", "Split Toe Socks", "Kaos Kaki Emboss", "Kaos Kaki Anti Slip", "Kaos Kaki Muslimah"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full antialiased font-sans`}>
      <body className="min-h-full flex flex-col bg-[#F7F4EE] selection:bg-dusty-rose selection:text-white">
        {children}
      </body>
    </html>
  );
}
