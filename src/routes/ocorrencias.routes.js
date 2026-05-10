const express = require('express')
const { Ocorrencia, Usuario, UsuarioOcorrencia } = require('../db/models')
const { finalizarOcorrencia } = require('../services/finalizarOcorrencia.service')
const { getBrigadistasOnline } = require('../sockets/presence')
const { encontrarBrigadistaMaisProximo } = require('../services/distribuirOcorrencia')

//  controle de tentativas
const tentativasPorOcorrencia = new Map()

//  controle de loops ativos
const distribuicoesAtivas = new Map()

function ocorrenciasRoutes(io) {
  const router = express.Router()

  function notificarBrigadistaMaisProximo(ocorrenciaId, latitude, longitude) {
    const brigadistasOnline = getBrigadistasOnline()

    let tentativas = tentativasPorOcorrencia.get(ocorrenciaId)
    if (!tentativas) {
      tentativas = new Set()
      tentativasPorOcorrencia.set(ocorrenciaId, tentativas)
    }

    const candidatos = encontrarBrigadistaMaisProximo(
      latitude,
      longitude,
      50,
      tentativas
    )

    for (const candidato of candidatos) {
      const brigadista = brigadistasOnline.get(candidato.userId)

      if (!brigadista || brigadista.ocupado) continue

      tentativas.add(candidato.userId)
      brigadista.notificadoOcorrencia = ocorrenciaId

      io.to(candidato.socketId).emit('NOVA_OCORRENCIA', {
        ocorrenciaId,
        latitude,
        longitude
      })

      const dist = candidato.distancia != null
        ? `${candidato.distancia.toFixed(1)}km`
        : 'distância desconhecida'

      console.log(`📡 Ocorrência #${ocorrenciaId} enviada ao brigadista ${candidato.userId} (${dist})`)

      return true
    }

    return false
  }

  // distribuição controlada (SEM concorrência duplicada)
  async function tentarDistribuirAteConseguir(ocorrencia) {
    const ocorrenciaId = ocorrencia.id

    if (distribuicoesAtivas.get(ocorrenciaId)) return

    distribuicoesAtivas.set(ocorrenciaId, true)

    let sucesso = false

    while (!sucesso) {
      const oc = await Ocorrencia.findByPk(ocorrenciaId)

      // se já foi assumida ou finalizada, para
      if (!oc || oc.status !== 'ABERTA') break

      sucesso = notificarBrigadistaMaisProximo(
        ocorrenciaId,
        oc.latitude,
        oc.longitude
      )

      if (!sucesso) {
        console.log(`⏳ Nenhum disponível para #${ocorrenciaId}, retry em 5s`)
        await new Promise(r => setTimeout(r, 5000))
      }
    }

    distribuicoesAtivas.delete(ocorrenciaId)
  }

  async function redistribuirOcorrenciasPendentes(brigadistaId) {
    const brigadistasOnline = getBrigadistasOnline()
    const brigadista = brigadistasOnline.get(brigadistaId)

    if (!brigadista || brigadista.ocupado) return

    const pendentes = await Ocorrencia.findAll({
      where: { status: 'ABERTA' },
      order: [['criado_em', 'ASC']]
    })

    for (const ocorrencia of pendentes) {
      if (!distribuicoesAtivas.get(ocorrencia.id)) {
        console.log(`🔄 Redistribuindo ocorrência #${ocorrencia.id}`)
        tentarDistribuirAteConseguir(ocorrencia)
      }
    }
  }

  // criar ocorrência
  router.post('/', async (req, res) => {
    const { usuario_id, latitude, longitude } = req.body

    if (!usuario_id || !latitude || !longitude) {
      return res.status(400).json({ erro: 'Dados incompletos' })
    }

    const ocorrencia = await Ocorrencia.create({
      usuario_id,
      latitude,
      longitude,
      status: 'ABERTA'
    })

    tentarDistribuirAteConseguir(ocorrencia)

    res.json({
      sucesso: true,
      ocorrenciaId: ocorrencia.id
    })
  })

  // recusar
  router.post('/:id/recusar', async (req, res) => {
    const { brigadista_id } = req.body
    const ocorrencia = await Ocorrencia.findByPk(req.params.id)

    if (!ocorrencia || ocorrencia.status !== 'ABERTA') {
      return res.status(400).json({ erro: 'Ocorrência não está mais disponível' })
    }

    console.log(`🚫 Brigadista ${brigadista_id} recusou ocorrência #${ocorrencia.id}`)

    const brigadistasOnline = getBrigadistasOnline()
    const brigadista = brigadistasOnline.get(brigadista_id)

    if (brigadista) {
      brigadista.notificadoOcorrencia = null
    }

    // ⚠️ NÃO cria novo loop se já existir
    if (!distribuicoesAtivas.get(ocorrencia.id)) {
      tentarDistribuirAteConseguir(ocorrencia)
    }

    res.json({ sucesso: true })
  })

  //  assumir ocorrência
  router.patch('/:id/status', async (req, res) => {
    const { brigadista_id } = req.body

    const [count] = await Ocorrencia.update(
      { status: 'EM_ATENDIMENTO', brigadista_id },
      { where: { id: req.params.id, status: 'ABERTA' } }
    )

    if (count === 0) {
      return res.status(400).json({
        erro: 'Ocorrência já foi assumida por outro brigadista'
      })
    }

    await UsuarioOcorrencia.create({
      papel: "BRIGADA",
      usuario_id: brigadista_id,
      ocorrencia_id: req.params.id
    })

    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaOnline = brigadistasOnline.get(brigadista_id)

    if (brigadistaOnline) {
      brigadistaOnline.ocupado = true
      brigadistaOnline.notificadoOcorrencia = null
    }

    const brigadista = await Usuario.findByPk(brigadista_id, {
      attributes: ['id', 'nome', 'telefone']
    })

    const ocorrencia = await Ocorrencia.findByPk(req.params.id, {
      attributes: ['usuario_id']
    })

    io.to(`cliente_${ocorrencia.usuario_id}`).emit(
      'OCORRENCIA_EM_ANDAMENTO',
      {
        ocorrenciaId: req.params.id,
        brigadista
      }
    )

    console.log(`✅ Ocorrência #${req.params.id} assumida pelo brigadista ${brigadista_id}`)

    res.json({ sucesso: true })
  })

  //  listar
  router.get('/', async (req, res) => {
    const where = req.query.status ? { status: req.query.status } : {}

    const rows = await Ocorrencia.findAll({
      where,
      order: [['criado_em', 'DESC']]
    })

    res.json(rows)
  })

  //  finalizar
  router.post('/:id/finalizada', async (req, res) => {
    try {
      const ocorrenciaId = req.params.id

      const ocorrencia = await Ocorrencia.findByPk(ocorrenciaId, {
        attributes: ['usuario_id', 'brigadista_id']
      })

      await finalizarOcorrencia(ocorrenciaId, req.body.descricao)

      const brigadistasOnline = getBrigadistasOnline()
      const brigadista = brigadistasOnline.get(ocorrencia.brigadista_id)

      //  libera brigadista
      if (brigadista) {
        brigadista.ocupado = false
        brigadista.notificadoOcorrencia = null
      }

      //  limpa controle
      tentativasPorOcorrencia.delete(ocorrenciaId)
      distribuicoesAtivas.delete(ocorrenciaId)

      io.to(`cliente_${ocorrencia.usuario_id}`).emit(
        'OCORRENCIA_FINALIZADA',
        { ocorrenciaId }
      )

      console.log(`🏁 Ocorrência #${ocorrenciaId} finalizada. Redistribuindo...`)

      await redistribuirOcorrenciasPendentes(ocorrencia.brigadista_id)

      res.json({ sucesso: true })
    } catch (err) {
      res.status(400).json({ erro: err.message })
    }
  })

  return router
}

module.exports = ocorrenciasRoutes