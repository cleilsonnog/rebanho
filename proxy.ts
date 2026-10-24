import { clerkMiddleware } from "@clerk/nextjs/server"

// Só disponibiliza a sessão do Clerk. A proteção fica em cada recurso (layout de /app, Server Actions),
// como o Clerk recomenda em vez de listar rotas aqui.
export default clerkMiddleware()

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
}
