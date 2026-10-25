"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Loader2, LocateFixed } from "lucide-react"
import { toast } from "sonner"

import { MembersMultiPicker } from "@/components/app/members-multi-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useFormAction } from "@/hooks/use-form-action"
import { geocodeAddress } from "@/lib/actions/cells"
import { DIAS_SEMANA } from "@/lib/format"
import { useApp } from "@/lib/store"
import type { Cell } from "@/lib/types"
import { cellSchema } from "@/lib/validations"

const LocationPicker = dynamic(
  () => import("@/components/app/cells-map").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    ),
  }
)

type Draft = Omit<Cell, "id">

const vazio: Draft = {
  nome: "",
  congregacao: "",
  diaSemana: undefined,
  horario: "",
  endereco: { rua: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" },
  lat: 0,
  lng: 0,
  lideres: [],
  colideres: [],
  anfitrioes: [],
  membroIds: [],
}

export function CellFormDialog({
  open,
  onOpenChange,
  cell,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  cell?: Cell
  onSaved?: (c: Cell) => void
}) {
  const members = useApp((s) => s.members)
  const cells = useApp((s) => s.cells)
  const filiais = useApp((s) => s.church.congregacoes)
  // Quem é de uma filial cadastra células só nela.
  const minhaFilial = useApp((s) => s.me.congregacao)
  const addCell = useApp((s) => s.addCell)
  const updateCell = useApp((s) => s.updateCell)
  const { errors, pending, submit, invalid } = useFormAction()
  const [buscando, setBuscando] = React.useState(false)
  const [d, setD] = React.useState<Draft>(() => {
    if (!cell) return { ...vazio, congregacao: minhaFilial ?? filiais[0] ?? "" }
    const lideranca = new Set([
      ...cell.lideres,
      ...cell.colideres,
      ...cell.anfitrioes,
    ])
    const { id: _id, ...rest } = cell
    return {
      ...rest,
      membroIds: cell.membroIds.filter((id) => !lideranca.has(id)),
    }
  })

  const byId = React.useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  )
  const celulaDe = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const c of cells)
      if (c.id !== cell?.id) for (const id of c.membroIds) map.set(id, c.nome)
    return map
  }, [cells, cell?.id])
  const hint = (id: string) =>
    celulaDe.has(id) ? `Hoje na célula ${celulaDe.get(id)}` : undefined

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((s) => ({ ...s, [k]: v }))
  const setEnd = (k: keyof Draft["endereco"], v: string) =>
    setD((s) => ({ ...s, endereco: { ...s.endereco, [k]: v } }))
  const lideranca = [...d.lideres, ...d.colideres, ...d.anfitrioes]

  function usarEnderecoDoAnfitriao(ids = d.anfitrioes) {
    const m = byId.get(ids[0])
    if (!m) return toast.error("Escolha o anfitrião primeiro.")
    // A posição do membro é aproximada (bairro); a da célula é a casa, então localiza pelo endereço.
    setD((s) => ({ ...s, endereco: { ...m.endereco }, lat: 0, lng: 0 }))
    if (m.endereco.rua || m.endereco.cep) localizar(m.endereco)
  }

  function setAnfitrioes(ids: string[]) {
    set("anfitrioes", ids)
    // Primeiro anfitrião escolhido: a célula vai para a casa dele.
    if (d.anfitrioes.length === 0 && ids.length > 0 && !d.endereco.rua)
      usarEnderecoDoAnfitriao(ids)
  }

  async function localizar(endereco = d.endereco) {
    setBuscando(true)
    try {
      const r = await geocodeAddress(endereco)
      if (!r.ok) return toast.error(r.error)
      setD((s) => ({ ...s, lat: r.data.lat, lng: r.data.lng }))
      toast.success(
        `Posição encontrada pelo ${r.data.precisao}. Ajuste o pino se precisar.`
      )
    } catch {
      toast.error("Sem conexão com o servidor. Tente de novo.")
    } finally {
      setBuscando(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(
      cellSchema,
      d,
      () => (cell ? updateCell(cell.id, d) : addCell(d)),
      (saved) => {
        toast.success(
          cell ? "Célula atualizada" : `Célula ${saved.nome} criada`
        )
        onOpenChange(false)
        onSaved?.(saved)
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {cell ? `Editar célula ${cell.nome}` : "Nova célula"}
          </DialogTitle>
          <DialogDescription>
            Liderança, quem frequenta e onde a célula se reúne.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {filiais.length > 1 && (
              <Field>
                <FieldLabel>Sede ou filial</FieldLabel>
                <Select value={d.congregacao || filiais[0]} onValueChange={(v) => set("congregacao", v)} disabled={Boolean(minhaFilial)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{filiais.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
                <FieldError>{errors.congregacao}</FieldError>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_160px_120px]">
              <Field>
                <FieldLabel htmlFor="cel-nome">Nome da célula</FieldLabel>
                <Input
                  {...invalid("nome")}
                  id="cel-nome"
                  placeholder="Ex.: Betesda"
                  value={d.nome}
                  onChange={(e) => set("nome", e.target.value)}
                />
                <FieldError>{errors.nome}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Dia</FieldLabel>
                <Select
                  value={d.diaSemana === undefined ? "" : String(d.diaSemana)}
                  onValueChange={(v) => set("diaSemana", Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((dia, i) => (
                      <SelectItem key={dia} value={String(i)}>
                        {dia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="cel-hora">Horário</FieldLabel>
                <Input
                  {...invalid("horario")}
                  id="cel-hora"
                  type="time"
                  value={d.horario}
                  onChange={(e) => set("horario", e.target.value)}
                />
                <FieldError>{errors.horario}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel>Líderes</FieldLabel>
              <FieldDescription>O casal que lidera a célula.</FieldDescription>
              <MembersMultiPicker
                value={d.lideres}
                onChange={(ids) => set("lideres", ids)}
                max={2}
                exclude={d.colideres}
                hint={hint}
              />
              <FieldError>{errors.lideres}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Colíderes</FieldLabel>
              <MembersMultiPicker
                value={d.colideres}
                onChange={(ids) => set("colideres", ids)}
                max={2}
                exclude={d.lideres}
                hint={hint}
              />
              <FieldError>{errors.colideres}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Anfitrião</FieldLabel>
              <FieldDescription>
                Quem abre a casa. Pode ser um casal, uma pessoa ou os próprios
                líderes.
              </FieldDescription>
              <MembersMultiPicker
                value={d.anfitrioes}
                onChange={setAnfitrioes}
                max={2}
                hint={hint}
              />
              <FieldError>{errors.anfitrioes}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Membros da célula</FieldLabel>
              <FieldDescription>
                Líderes, colíderes e anfitriões já entram na lista de presença.
              </FieldDescription>
              <MembersMultiPicker
                value={d.membroIds}
                onChange={(ids) => set("membroIds", ids)}
                exclude={lideranca}
                hint={hint}
                addLabel="Adicionar membro"
              />
              <FieldError>{errors.membroIds}</FieldError>
            </Field>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">Local da reunião</p>
                <p className="text-sm text-muted-foreground">
                  A casa do anfitrião, que aparece no mapa.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => usarEnderecoDoAnfitriao()}
              >
                Usar endereço do anfitrião
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
              <Field>
                <FieldLabel htmlFor="cel-rua">Rua</FieldLabel>
                <Input
                  id="cel-rua"
                  value={d.endereco.rua}
                  onChange={(e) => setEnd("rua", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cel-num">Número</FieldLabel>
                <Input
                  id="cel-num"
                  value={d.endereco.numero}
                  onChange={(e) => setEnd("numero", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_70px_120px]">
              <Field>
                <FieldLabel htmlFor="cel-bairro">Bairro</FieldLabel>
                <Input
                  id="cel-bairro"
                  value={d.endereco.bairro}
                  onChange={(e) => setEnd("bairro", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cel-cidade">Cidade</FieldLabel>
                <Input
                  id="cel-cidade"
                  value={d.endereco.cidade}
                  onChange={(e) => setEnd("cidade", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cel-uf">UF</FieldLabel>
                <Input
                  {...invalid("endereco.uf")}
                  id="cel-uf"
                  maxLength={2}
                  value={d.endereco.uf}
                  onChange={(e) => setEnd("uf", e.target.value)}
                />
                <FieldError>{errors["endereco.uf"]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="cel-cep">CEP</FieldLabel>
                <Input
                  {...invalid("endereco.cep")}
                  id="cel-cep"
                  value={d.endereco.cep}
                  onChange={(e) => setEnd("cep", e.target.value)}
                />
                <FieldError>{errors["endereco.cep"]}</FieldError>
              </Field>
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Clique no mapa ou arraste o pino até a casa.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => localizar()}
                  disabled={buscando}
                >
                  {buscando ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <LocateFixed />
                  )}{" "}
                  Localizar endereço
                </Button>
              </div>
              <div className="h-64 overflow-hidden rounded-lg border">
                <LocationPicker
                  lat={d.lat}
                  lng={d.lng}
                  onChange={(lat, lng) => setD((s) => ({ ...s, lat, lng }))}
                />
              </div>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Salvando…"
                : cell
                  ? "Salvar alterações"
                  : "Criar célula"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
