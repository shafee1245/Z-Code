import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Studio | Create and track QR codes",
  description: "Create branded QR codes and understand every scan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
