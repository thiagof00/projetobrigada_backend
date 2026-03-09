const express = require('express')
const { Ocorrencia, Usuario, UsuarioOcorrencia } = require('../db/models')
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
    if (brigadistaOnline) brigadistaOnline.notificadoOcorrencia = ocorrenciaId
    io.to(candidato.socketId).emit('NOVA_OCORRENCIA', { ocorrenciaId, latitude, longitude })
    const dist = candidato.distancia != null ? `${candidato.distancia.toFixed(1)}km` : 'distância desconhecida'
    console.log(`📡 Ocorrência #${ocorrenciaId} enviada ao brigadista ${candidato.userId} (${dist})`)
    return true
  }

  async function redistribuirOcorrenciasPendentes(brigadistaId) {
    const brigadistasOnline = getBrigadistasOnline()
    const brigadista = brigadistasOnline.get(brigadistaId)
    if (!brigadista || brigadista.ocupado) return

    const notificadas = new Set(
      [...brigadistasOnline.values()].map(b => b.notificadoOcorrencia).filter(id => id != null)
    )
    const pendentes = await Ocorrencia.findAll({ where: { status: 'ABERTA' }, order: [['criado_em', 'ASC']] })
    const pendente = pendentes.find(o => !notificadas.has(o.id))
    if (!pendente) return

    console.log(`🔄 Redistribuindo ocorrência #${pendente.id} para brigadista ${brigadistaId}`)
    brigadista.notificadoOcorrencia = pendente.id
    io.to(brigadista.socketId).emit('NOVA_OCORRENCIA', { ocorrenciaId: pendente.id, latitude: pendente.latitude, longitude: pendente.longitude })
  }

  router.post('/', async (req, res) => {
    const { usuario_id, latitude, longitude } = req.body
    if (!usuario_id || !latitude || !longitude) return res.status(400).json({ erro: 'Dados incompletos' })
    const ocorrencia = await Ocorrencia.create({ usuario_id, latitude, longitude, status: 'ABERTA' })
    const notificou = notificarBrigadistaMaisProximo(ocorrencia.id, latitude, longitude)
    res.json({ sucesso: true, ocorrenciaId: ocorrencia.id, brigadistaNotificado: notificou })
  })

  router.post('/:id/recusar', async (req, res) => {
    const { brigadista_id } = req.body
    const ocorrencia = await Ocorrencia.findByPk(req.params.id)
    if (!ocorrencia || ocorrencia.status !== 'ABERTA') return res.status(400).json({ erro: 'Ocorrência não está mais disponível' })

    console.log(`🚫 Brigadista ${brigadista_id} recusou ocorrência #${ocorrencia.id}. Buscando próximo...`)
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaQueRecusou = brigadistasOnline.get(brigadista_id)
    if (brigadistaQueRecusou) { brigadistaQueRecusou.notificadoOcorrencia = null; brigadistaQueRecusou.ocupado = true }

    const notificou = notificarBrigadistaMaisProximo(ocorrencia.id, ocorrencia.latitude, ocorrencia.longitude)
    if (brigadistaQueRecusou) brigadistaQueRecusou.ocupado = false
    if (!notificou) return res.json({ sucesso: false, mensagem: 'Nenhum outro brigadista disponível no momento' })
    res.json({ sucesso: true })
  })

  router.patch('/:id/status', async (req, res) => {
    const { brigadista_id } = req.body
    const [count] = await Ocorrencia.update(
      { status: 'EM_ATENDIMENTO', brigadista_id },
      { where: { id: req.params.id, status: 'ABERTA' } }
    )
    UsuarioOcorrencia.create({papel:"BRIGADA", usuario_id:brigadista_id, ocorrencia_id: req.params.id})
    if (count === 0) return res.status(400).json({ erro: 'Ocorrência já foi assumida por outro brigadista' })

    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaOnline = brigadistasOnline.get(brigadista_id)
    if (brigadistaOnline) { brigadistaOnline.ocupado = true; brigadistaOnline.notificadoOcorrencia = null }

    const brigadista = await Usuario.findByPk(brigadista_id, { attributes: ['id', 'nome', 'telefone'] })
    const ocorrencia = await Ocorrencia.findByPk(req.params.id, { attributes: ['usuario_id'] })
    io.to(`cliente_${ocorrencia.usuario_id}`).emit('OCORRENCIA_EM_ANDAMENTO', { ocorrenciaId: req.params.id, brigadista })
    console.log(`✅ Ocorrência #${req.params.id} assumida pelo brigadista ${brigadista_id}`)
    res.json({ sucesso: true })
  })

  router.get('/', async (req, res) => {
    const where = req.query.status ? { status: req.query.status } : {}
    const rows = await Ocorrencia.findAll({ where, order: [['criado_em', 'DESC']] })
    res.json(rows)
  })

  router.post('/:id/finalizada', async (req, res) => {
    try {
      const ocorrenciaId = req.params.id
      const ocorrencia = await Ocorrencia.findByPk(ocorrenciaId, { attributes: ['usuario_id', 'brigadista_id'] })
      await finalizarOcorrencia(ocorrenciaId, req.body.descricao)

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
