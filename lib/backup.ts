import "server-only"

// Backup semanal do banco: uma branch da Neon criada a partir da principal guarda o estado daquele momento.
// É instantânea, não tem servidor próprio (não gasta horas de computação) e só ocupa espaço com o que mudar
// depois. O plano Free da Neon só volta 6 horas no tempo e não agenda snapshots, por isso fazemos assim.
// Como restaurar: docs/backup.md.

const API = "https://console.neon.tech/api/v2"
const PREFIXO = "backup-"
/** Quantos backups semanais guardar (o plano Free permite 10 branches por projeto). */
export const MANTER = 4

type Branch = { id: string; name: string; parent_id?: string; default?: boolean; created_at: string }

function config() {
  const apiKey = process.env.NEON_API_KEY
  const projeto = process.env.NEON_PROJECT_ID
  if (!apiKey || !projeto) throw new Error("Configure NEON_API_KEY e NEON_PROJECT_ID para o backup.")
  return { apiKey, projeto }
}

async function neon<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const { apiKey, projeto } = config()
  const r = await fetch(`${API}/projects/${projeto}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!r.ok) throw new Error(`Neon ${init.method ?? "GET"} ${caminho}: ${r.status} ${await r.text()}`)
  return (await r.json()) as T
}

/** Cria o backup da semana (se ainda não existir) e apaga os que passaram de `MANTER`. */
export async function backupSemanal(hoje = new Date()) {
  const { branches } = await neon<{ branches: Branch[] }>("/branches")
  const principal = branches.find((b) => b.default)
  if (!principal) throw new Error("Branch principal não encontrada no projeto da Neon.")

  const nome = `${PREFIXO}${hoje.toISOString().slice(0, 10)}`
  const jaExiste = branches.some((b) => b.name === nome)
  // Sem `endpoints`: a branch não ganha servidor; para consultar um backup, crie um no console.
  if (!jaExiste) await neon("/branches", { method: "POST", body: JSON.stringify({ branch: { parent_id: principal.id, name: nome } }) })

  const backups = branches
    .filter((b) => b.name.startsWith(PREFIXO) && b.parent_id === principal.id && b.name !== nome)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const removidos = backups.slice(MANTER - 1)
  for (const b of removidos) await neon(`/branches/${b.id}`, { method: "DELETE" })

  return { criado: jaExiste ? null : nome, removidos: removidos.map((b) => b.name) }
}
