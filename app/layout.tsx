import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Fraunces, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { ptBR } from "@clerk/localizations"
import { shadcn } from "@clerk/ui/themes"

import "./globals.css"
import { StoreHydrator } from "@/components/store-hydrator"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const fontSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" })
const fontHeading = Fraunces({ subsets: ["latin"], variable: "--font-heading" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: {
    default: "Rebanho — Gestão de membros para igrejas",
    template: "%s · Rebanho",
  },
  description:
    "Membros, visitas pastorais, dízimos, aniversariantes, carteirinhas e certificados em um só sistema para sua igreja.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        fontHeading.variable,
        fontMono.variable,
        "font-sans"
      )}
    >
      <body>
        <ClerkProvider
          localization={ptBR}
          appearance={{ theme: shadcn }}
          taskUrls={{ "choose-organization": "/igreja" }}
        >
          <StoreHydrator />
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
