"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useClerk, useOrganization, useUser } from "@clerk/nextjs"
import {
  ArrowLeftRight,
  Award,
  Cake,
  CalendarDays,
  ChevronsUpDown,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  House,
  IdCard,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageCircle,
  Settings,
  Upload,
  Users,
} from "lucide-react"

import { LogoMark } from "@/components/brand"
import { ChurchLogo } from "@/components/app/church-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { daysUntilBirthday, initials } from "@/lib/format"
import { canRead, canWrite } from "@/lib/permissions"
import { useApp } from "@/lib/store"
import type { UserRole } from "@/lib/types"

const NAV = [
  { label: "Visão geral", items: [{ title: "Painel", href: "/app", icon: LayoutDashboard }] },
  {
    label: "Pessoas",
    items: [
      { title: "Membros", href: "/app/membros", icon: Users },
      { title: "Importar", href: "/app/importar", icon: Upload },
      { title: "Visitas pastorais", href: "/app/visitas", icon: HeartHandshake },
      { title: "Aniversários", href: "/app/aniversarios", icon: Cake, badge: "birthdays" },
      { title: "Mapa de membros", href: "/app/mapa", icon: MapPinned },
    ],
  },
  {
    label: "Documentos",
    items: [
      { title: "Carteirinhas", href: "/app/carteirinhas", icon: IdCard },
      { title: "Certificados", href: "/app/certificados", icon: Award },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Células", href: "/app/celulas", icon: House },
      { title: "Escolas", href: "/app/escolas", icon: GraduationCap },
      { title: "Financeiro", href: "/app/financeiro", icon: HandCoins },
      { title: "Agenda", href: "/app/agenda", icon: CalendarDays },
      { title: "WhatsApp", href: "/app/whatsapp", icon: MessageCircle },
      { title: "Configurações", href: "/app/configuracoes", icon: Settings },
    ],
  },
] as const

/** Esconde do menu o que a função não usa. O servidor bloqueia de qualquer forma. */
const VISIVEL: Record<string, (papel: UserRole, professor: boolean) => boolean> = {
  "/app/importar": (p) => canWrite(p, "membros"),
  "/app/visitas": (p) => canRead(p, "visitas"),
  "/app/mapa": (p) => canRead(p, "mapa"),
  "/app/carteirinhas": (p) => canRead(p, "certificados"),
  "/app/certificados": (p) => canRead(p, "certificados"),
  "/app/celulas": (p) => canRead(p, "celulas"),
  // Tesouraria e líder de célula só veem Escolas se forem professores de alguma turma.
  "/app/escolas": (p, professor) => ["admin", "secretaria", "pastor"].includes(p) || professor,
  "/app/financeiro": (p) => canRead(p, "financeiro"),
  "/app/whatsapp": (p) => p === "admin",
  "/app/configuracoes": (p) => p === "admin",
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { organization } = useOrganization()
  const { signOut } = useClerk()
  const papel = useApp((s) => s.me.papel)
  const professor = useApp((s) => s.schoolClasses.length > 0)
  const nome = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? ""
  const birthdays = useApp(
    (s) => s.members.filter((m) => m.status !== "transferido" && daysUntilBirthday(m.nascimento) <= 7).length
  )

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/app">
                <ChurchLogo className="size-8 shrink-0 rounded-md" fallback={<LogoMark className="size-8 shrink-0" />} />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-heading text-base font-semibold">Rebanho</span>
                  <span className="truncate text-xs text-muted-foreground">{organization?.name}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.filter((item) => VISIVEL[item.href]?.(papel, professor) ?? true).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {"badge" in item && birthdays > 0 && <SidebarMenuBadge>{birthdays}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    <AvatarImage src={user?.imageUrl} alt="" />
                    <AvatarFallback className="bg-primary/15 text-primary">{initials(nome || "U")}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{nome}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {papel === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/app/configuracoes"><Settings /> Configurações</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/igreja"><ArrowLeftRight /> Trocar de igreja</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/entrar" })}>
                  <LogOut /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
