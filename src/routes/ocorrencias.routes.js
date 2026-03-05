const express = require('express')
const prisma = require('../db/db')
const { finalizarOcorrencia } = require('../services/finalizarOcorrencia.service')
const { getBrigadistasOnline } = require('../sockets/presence')
const { encontrarBrigadistaMaisProximo } = require('../services/distribuirOcorrencia')

function ocorrenciasRoutes(io) {
  const router = express.Router()

  function notificarBrigadistaMaisProximo(ocorrenciaId, latitude, longitude) {
    const candidato = encontrarBrigadistaMaisProximo(latitude, longitude)
    if (!candidato) {
      console.log(`⚠️  Nenhum brigadista disponível para ocorrência #${ocorrenciaId}`)
      return false
    }
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaOnline = brigadistasOnline.get(candidato.userId)
    if (brigadistaOnline) {
      brigadistaOnline.notificadoOcorrencia = ocorrenciaId
    }
    io.to(candidato.socketId).emit('NOVA_OCORRENCIA', { ocorrenciaId, latitude, longitude })
    const distanciaInfo = candidato.distancia != null ? `${candidato.distancia.toFixed(1)}km` : 'distância desconhecida'
    console.log(`📡 Ocorrência #${ocorrenciaId} enviada ao brigadista ${candidato.userId} (${distanciaInfo})`)
    return true
  }

  async function redistribuirOcorrenciasPendentes(brigadistaId) {
    const brigadistasOnline = getBrigadistasOnline()
    const brigadista = brigadistasOnline.get(brigadistaId)
    if (!brigadista || brigadista.ocupado) return

    const ocorrenciasNotificadas = new Set(
      [...brigadistasOnline.values()].map(b => b.notificadoOcorrencia).filter(id => id != null)
    )

    const pendentes = await prisma.ocorrencia.findMany({
      where: { status: 'ABERTA' },
      orderBy: { criado_em: 'asc' }
    })

    const pendente = pendentes.find(o => !ocorrenciasNotificadas.has(o.id))
    if (!pendente) return

    console.log(`🔄 Redistribuindo ocorrência #${pendente.id} para brigadista ${brigadistaId}`)
    brigadista.notificadoOcorrencia = pendente.id
    io.to(brigadista.socketId).emit('NOVA_OCORRENCIA', {
      ocorrenciaId: pendente.id,
      latitude: pendente.latitude,
      longitude: pendente.longitude
    })
  }

  // ABRIR OCORRÊNCIA
  router.post('/', async (req, res) => {
    const { usuario_id, latitude, longitude } = req.body
    if (!usuario_id || !latitude || !longitude) {
      return res.status(400).json({ erro: 'Dados incompletos' })
    }
    const ocorrencia = await prisma.ocorrencia.create({
      data: { usuario_id: Number(usuario_id), latitude, longitude, status: 'ABERTA' }
    })
    const notificou = notificarBrigadistaMaisProximo(ocorrencia.id, latitude, longitude)
    res.json({ sucesso: true, ocorrenciaId: ocorrencia.id, brigadistaNotificado: notificou })
  })

  // RECUSAR OCORRÊNCIA
  router.post('/:id/recusar', async (req, res) => {
    const { brigadista_id } = req.body
    const ocorrenciaId = Number(req.params.id)
    const ocorrencia = await prisma.ocorrencia.findUnique({
      where: { id: ocorrenciaId },
      select: { id: true, latitude: true, longitude: true, status: true }
    })
    if (!ocorrencia || ocorrencia.status !== 'ABERTA') {
      return res.status(400).json({ erro: 'Ocorrência não está mais disponível' })
    }
    console.log(`🚫 Brigadista ${brigadista_id} recusou ocorrência #${ocorrenciaId}. Buscando próximo...`)
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaQueRecusou = brigadistasOnline.get(brigadista_id)
    if (brigadistaQueRecusou) {
      brigadistaQueRecusou.notificadoOcorrencia = null
      brigadistaQueRecusou.ocupado = true
    }
    const notificou = notificarBrigadistaMaisProximo(ocorrenciaId, ocorrencia.latitude, ocorrencia.longitude)
    if (brigadistaQueRecusou) brigadistaQueRecusou.ocupado = false
    if (!notificou) {
      return res.json({ sucesso: false, mensagem: 'Nenhum outro brigadista disponível no momento' })
    }
    res.json({ sucesso: true })
  })

  // ACEITAR OCORRÊNCIA
  router.patch('/:id/status', async (req, res) => {
    const { brigadista_id } = req.body
    const ocorrenciaId = Number(req.params.id)
    const updated = await prisma.ocorrencia.updateMany({
      where: { id: ocorrenciaId, status: 'ABERTA' },
      data: { status: 'EM_ATENDIMENTO', brigadista_id: Number(brigadista_id) }
    })
    if (updated.count === 0) {
      return res.status(400).json({ erro: 'Ocorrência já foi assumida por outro brigadista' })
    }
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaOnline = brigadistasOnline.get(brigadista_id)
    if (brigadistaOnline) {
      brigadistaOnline.ocupado = true
      brigadistaOnline.notificadoOcorrencia = null
    }
    const brigadista = await prisma.usuario.findUnique({
      where: { id: Number(brigadista_id) },
      select: { id: true, nome: true, telefone: true }
    })
    const ocorrencia = await prisma.ocorrencia.findUnique({
      where: { id: ocorrenciaId },
      select: { usuario_id: true }
    })
    io.to(`cliente_${ocorrencia.usuario_id}`).emit('OCORRENCIA_EM_ANDAMENTO', { ocorrenciaId, brigadista })
    console.log(`✅ Ocorrência #${ocorrenciaId} assumida pelo brigadista ${brigadista_id}`)
    res.json({ sucesso: true })
  })

  // LISTAR
  router.get('/', async (req, res) => {
    const { status } = req.query
    const rows = await prisma.ocorrencia.findMany({
      where: status ? { status } : undefined,
      orderBy: { criado_em: 'desc' }
    })
    res.json(rows)
  })

  // FINALIZAR OCORRÊNCIA
  router.post('/:id/finalizada', async (req, res) => {
    try {
      const { descricao } = req.body
      const ocorrenciaId = Number(req.params.id)
      const ocorrencia = await prisma.ocorrencia.findUnique({
        where: { id: ocorrenciaId },
        select: { usuario_id: true, brigadista_id: true }
      })
      await finalizarOcorrencia(ocorrenciaId, descricao)
      const brigadistasOnline = getBrigadistasOnline()
      const brigadista = brigadistasOnline.get(ocorrencia.brigadista_id)
      if (brigadista) brigadista.ocupado = false
      io.to(`cliente_${ocorrencia.usuario_id}`).emit('OCORRENCIA_FINALIZADA', { ocorrenciaId })
      console.log(`🏁 Ocorrência #${ocorrenciaId} finalizada. Verificando pendentes...`)
      await redistribuirOcorrenciasPendentes(ocorrencia.brigadista_id)
      res.json({ sucesso: true })
    } catch (err) {
      res.status(400).json({ erro: err.message })
    }
  })

  return router
}

module.exports = ocorrenciasRoutes
