import { db } from "@/lib/db"
import { idSchema } from "@/lib/validations"

// Logo da igreja guardada no banco (lib/actions/church.ts › updateLogo). Pública como a página da carteirinha:
// aparece na verificação, nos certificados e no portal. O endereço muda a cada troca (?v=), então dá para guardar
// em cache por muito tempo.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = idSchema.safeParse((await params).id)
  const logo = id.success ? await db.churchLogo.findUnique({ where: { churchId: id.data } }) : null
  if (!logo) return new Response("Logo não encontrada", { status: 404 })
  return new Response(Buffer.from(logo.dados), {
    headers: {
      "Content-Type": logo.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
