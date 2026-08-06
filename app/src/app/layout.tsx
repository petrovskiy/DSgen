import type { Metadata } from "next";
import { Manrope, Tenor_Sans } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

const tenorSans = Tenor_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-heading",
  weight: "400",
});

export const metadata: Metadata = {
  title: "DSgen — Генератор дизайн-систем",
  description:
    "Создайте дизайн-систему за минуты: палитра, шрифты, токены, экспорт в ZIP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      data-theme="light"
      className={`${manrope.variable} ${tenorSans.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('dsgen-shell-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="font-body bg-background text-primary min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
