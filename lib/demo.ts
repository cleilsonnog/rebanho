import { randomUUID } from "node:crypto"

import type { Prisma } from "./generated/prisma/client"
import { seedCertificates, seedChurch, seedEvents, seedMembers, seedTransactions, seedVisits } from "./seed"

// Sem "server-only" para que o `prisma/seed.ts` (rodado com tsx) também use estas funções.

const date = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** Apaga células, membros, visitas, lançamentos, eventos, certificados e congregações da igreja. */
export async function clearChurchData(tx: Prisma.TransactionClient, churchId: string) {
  const where = { churchId }
  await tx.cell.deleteMany({ where })
  await tx.visit.deleteMany({ where })
  await tx.certificate.deleteMany({ where })
  await tx.transaction.deleteMany({ where })
  await tx.member.deleteMany({ where })
  await tx.event.deleteMany({ where })
  await tx.congregation.deleteMany({ where })
}

/** Insere os dados de exemplo na igreja, com ids novos para não colidir com os de outra igreja. */
export async function insertDemoData(tx: Prisma.TransactionClient, churchId: string) {
  await tx.congregation.createMany({ data: seedChurch.congregacoes.map((nome) => ({ churchId, nome })) })
  const congs = await tx.congregation.findMany({ where: { churchId } })
  const congId = new Map(congs.map((c) => [c.nome, c.id]))
  const memberId = new Map(seedMembers.map((m) => [m.id, randomUUID()]))

  await tx.member.createMany({
    data: seedMembers.map(({ id, endereco, congregacao, nascimento, dataBatismo, membroDesde, ...m }) => ({
      ...m,
      ...endereco,
      id: memberId.get(id),
      churchId,
      congregationId: congId.get(congregacao),
      nascimento: date(nascimento),
      dataBatismo: dataBatismo ? date(dataBatismo) : null,
      membroDesde: date(membroDesde),
    })),
  })

  await tx.visit.createMany({
    data: seedVisits.map(({ id: _id, membroId, data, proximaVisita, ...v }) => ({
      ...v,
      churchId,
      memberId: memberId.get(membroId)!,
      data: date(data),
      proximaVisita: proximaVisita ? date(proximaVisita) : null,
    })),
  })

  await tx.transaction.createMany({
    data: seedTransactions.map(({ id: _id, membroId, data, ...t }) => ({
      ...t,
      churchId,
      memberId: membroId && memberId.get(membroId),
      data: date(data),
    })),
  })

  await tx.event.createMany({
    data: seedEvents.map(({ id: _id, data, ...e }) => ({ ...e, churchId, data: date(data) })),
  })

  await tx.certificate.createMany({
    data: seedCertificates.map(({ id: _id, membroId, emitidoEm, ...c }) => ({
      ...c,
      churchId,
      memberId: memberId.get(membroId)!,
      emitidoEm: date(emitidoEm),
    })),
  })

  await insertDemoCells(tx, churchId, (id) => memberId.get(id)!)
}

const CELULAS = [
  { nome: "Betesda", diaSemana: 3, horario: "19:30" },
  { nome: "Siloé", diaSemana: 4, horario: "20:00" },
  { nome: "Emaús", diaSemana: 2, horario: "19:30" },
  { nome: "Betel", diaSemana: 5, horario: "20:00" },
]

/** Uma célula por bairro: casal de líderes, casal de colíderes, anfitriões e as últimas quatro reuniões. */
async function insertDemoCells(tx: Prisma.TransactionClient, churchId: string, novoId: (seedId: string) => string) {
  // Adultos ativos, casados primeiro: a liderança sai daqui.
  const adultos = seedMembers
    .filter((m) => m.status === "ativo" && m.nascimento <= "2004-01-01")
    .sort((a, b) => Number(b.estadoCivil === "casado") - Number(a.estadoCivil === "casado"))
  const adultosNo = (b: string) => adultos.filter((m) => m.endereco.bairro === b).length
  const bairros = [...new Set(seedMembers.map((m) => m.endereco.bairro))].sort((a, b) => adultosNo(b) - adultosNo(a))

  for (const [i, c] of CELULAS.entries()) {
    const doBairro = seedMembers.filter((m) => m.endereco.bairro === bairros[i] && m.status !== "transferido")
    const daqui = adultos.filter((m) => m.endereco.bairro === bairros[i])
    const homens = daqui.filter((m) => m.sexo === "M")
    const mulheres = daqui.filter((m) => m.sexo === "F")
    if (homens.length < 2 || mulheres.length < 2) continue

    const lideres = [homens[0], mulheres[0]]
    const colideres = [homens[1], mulheres[1]]
    const anfitriao = mulheres[2] ?? lideres[1]
    const lideranca = new Set([...lideres, ...colideres, anfitriao].map((m) => m.id))
    const membros = [...lideranca, ...doBairro.filter((m) => !lideranca.has(m.id)).slice(0, 8).map((m) => m.id)]

    const cell = await tx.cell.create({
      data: { churchId, ...c, ...anfitriao.endereco, lat: anfitriao.lat, lng: anfitriao.lng },
    })
    await tx.cellLeader.createMany({
      data: [
        ...lideres.map((m) => ({ cellId: cell.id, memberId: novoId(m.id), funcao: "lider" as const })),
        ...colideres.map((m) => ({ cellId: cell.id, memberId: novoId(m.id), funcao: "colider" as const })),
        { cellId: cell.id, memberId: novoId(anfitriao.id), funcao: "anfitriao" as const },
      ],
    })
    await tx.member.updateMany({ where: { churchId, id: { in: membros.map(novoId) } }, data: { cellId: cell.id } })

    // Últimas quatro semanas até 24/10/2026, no dia da semana da célula.
    const ref = date("2026-10-24")
    const ultima = new Date(ref.getTime() - ((ref.getUTCDay() - c.diaSemana + 7) % 7) * 86_400_000)
    for (let s = 0; s < 4; s++) {
      const meeting = await tx.cellMeeting.create({
        data: {
          churchId,
          cellId: cell.id,
          data: new Date(ultima.getTime() - s * 7 * 86_400_000),
          observacoes: ["Estudo sobre Filipenses 4. Pedidos de oração pela família do anfitrião.", "Noite de louvor e testemunhos.", "Estudo: o bom pastor (João 10).", ""][s],
          visitantes: s % 2 === 0 ? { create: [{ nome: "Carla Mendonça", telefone: "(62) 98123-4455" }] } : undefined,
        },
      })
      await tx.cellAttendance.createMany({
        data: membros.filter((_, j) => (j + s + i) % 4 !== 0).map((id) => ({ meetingId: meeting.id, memberId: novoId(id) })),
      })
    }
  }
}
