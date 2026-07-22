import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "比例工坊｜PNG 图片比例调整器",
    description: "在浏览器本地裁剪、留白或拉伸 PNG 图片，快速导出任意比例。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "比例工坊",
      description: "把 PNG 变成刚刚好的比例",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1729, height: 910, alt: "比例工坊 PNG 比例调整器" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "比例工坊",
      description: "把 PNG 变成刚刚好的比例",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
