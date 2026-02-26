const express = require('express')
const db = require('../db/db')
const { finalizarOcorrencia } = require('../services/finalizarOcorrencia.service')
const { getBrigadistasOnline } = require('../sockets/presence')
const { encontrarBrigadistaMaisProximo } = require('../services/distribuirOcorrencia')

function ocorrenciasRoutes(io) {
  const router = express.Router()

  // ===============================
  // HELPERS
  // ===============================

  /**
   * Tenta notificar o brigadista livre mais próximo sobre uma ocorrência aberta.
   * Retorna true se encontrou alguém para notificar, false caso contrário.
   */
  function notificarBrigadistaMaisProximo(ocorrenciaId, latitude, longitude) {
    const candidato = encontrarBrigadistaMaisProximo(latitude, longitude)

    if (!candidato) {
      console.log(`⚠️  Nenhum brigadista disponível para ocorrência #${ocorrenciaId}`)
      return false
    }

    // Marca o brigadista como aguardando resposta desta ocorrência
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaOnline = brigadistasOnline.get(candidato.userId)
    if (brigadistaOnline) {
      brigadistaOnline.notificadoOcorrencia = ocorrenciaId
    }

    io.to(candidato.socketId).emit('NOVA_OCORRENCIA', {
      ocorrenciaId,
      latitude,
      longitude
    })

    const distanciaInfo = candidato.distancia != null
      ? `${candidato.distancia.toFixed(1)}km`
      : 'distância desconhecida'

    console.log(`📡 Ocorrência #${ocorrenciaId} enviada ao brigadista ${candidato.userId} (${distanciaInfo})`)
    return true
  }

  /**
   * Ao liberar um brigadista, verifica se há ocorrências ABERTAS aguardando
   * e redistribui a mais antiga para ele imediatamente.
   */
  function redistribuirOcorrenciasPendentes(brigadistaId) {
    const brigadistasOnline = getBrigadistasOnline()
    const brigadista = brigadistasOnline.get(brigadistaId)

    if (!brigadista || brigadista.ocupado) return

    // Busca a ocorrência aberta mais antiga que ainda não tem nenhum brigadista sendo notificado
    // (ou seja, que não está na fila "notificadoOcorrencia" de nenhum brigadista online)
    const ocorrenciasNotificadas = new Set(
      [...brigadistasOnline.values()]
        .map(b => b.notificadoOcorrencia)
        .filter(id => id != null)
    )

    const pendentes = db.prepare(`
      SELECT id, latitude, longitude
      FROM ocorrencia
      WHERE status = 'ABERTA'
      ORDER BY criado_em ASC
    `).all()

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


  // ===============================
  // ABRIR OCORRÊNCIA
  // ===============================
  router.post('/', (req, res) => {
    const { usuario_id, latitude, longitude } = req.body

    if (!usuario_id || !latitude || !longitude) {
      return res.status(400).json({ erro: 'Dados incompletos' })
    }

    const result = db.prepare(`
      INSERT INTO ocorrencia (usuario_id, latitude, longitude, status)
      VALUES (?, ?, ?, 'ABERTA')
    `).run(usuario_id, latitude, longitude)

    const ocorrenciaId = result.lastInsertRowid

    // 🎯 Notifica apenas o brigadista livre mais próximo (não broadcast cego)
    const notificou = notificarBrigadistaMaisProximo(ocorrenciaId, latitude, longitude)

    res.json({ sucesso: true, ocorrenciaId, brigadistaNotificado: notificou })
  })


  // ===============================
  // RECUSAR OCORRÊNCIA
  // ===============================
  // Quando o brigadista notificado recusa, o sistema tenta o próximo disponível
  router.post('/:id/recusar', (req, res) => {
    const { brigadista_id } = req.body
    const ocorrenciaId = req.params.id

    // Verifica se a ocorrência ainda está aberta
    const ocorrencia = db.prepare(`
      SELECT id, latitude, longitude, status
      FROM ocorrencia WHERE id = ?
    `).get(ocorrenciaId)

    if (!ocorrencia || ocorrencia.status !== 'ABERTA') {
      return res.status(400).json({ erro: 'Ocorrência não está mais disponível' })
    }

    console.log(`🚫 Brigadista ${brigadista_id} recusou ocorrência #${ocorrenciaId}. Buscando próximo...`)

    // Temporariamente ignora quem recusou para buscar outro candidato
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaQueRecusou = brigadistasOnline.get(brigadista_id)

    // Libera a notificação pendente e marca como ocupado momentaneamente para não ser selecionado
    if (brigadistaQueRecusou) {
      brigadistaQueRecusou.notificadoOcorrencia = null
      brigadistaQueRecusou.ocupado = true
    }

    const notificou = notificarBrigadistaMaisProximo(
      ocorrenciaId,
      ocorrencia.latitude,
      ocorrencia.longitude
    )

    // Devolve disponibilidade após tentativa
    if (brigadistaQueRecusou) brigadistaQueRecusou.ocupado = false

    if (!notificou) {
      return res.json({ sucesso: false, mensagem: 'Nenhum outro brigadista disponível no momento' })
    }

    res.json({ sucesso: true })
  })


  // ===============================
  // ACEITAR OCORRÊNCIA
  // ===============================
  router.patch('/:id/status', (req, res) => {
    const { brigadista_id } = req.body
    const ocorrenciaId = req.params.id

    // 🔐 Garantia de exclusividade no banco — só 1 brigadista consegue atualizar
    const result = db.prepare(`
      UPDATE ocorrencia
      SET status = 'EM_ATENDIMENTO',
          brigadista_id = ?
      WHERE id = ? AND status = 'ABERTA'
    `).run(brigadista_id, ocorrenciaId)

    if (result.changes === 0) {
      return res.status(400).json({ erro: 'Ocorrência já foi assumida por outro brigadista' })
    }

    // 🔒 Marca brigadista como ocupado no Map de presença
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaOnline = brigadistasOnline.get(brigadista_id)
    if (brigadistaOnline) {
      brigadistaOnline.ocupado = true
      brigadistaOnline.notificadoOcorrencia = null // limpeza: não aguarda mais resposta
    }

    // 🔎 Busca dados para notificar o cliente
    const brigadista = db.prepare(`
      SELECT id, nome, telefone FROM usuario WHERE id = ?
    `).get(brigadista_id)

    const ocorrencia = db.prepare(`
      SELECT usuario_id FROM ocorrencia WHERE id = ?
    `).get(ocorrenciaId)

    // 🔔 Notifica o cliente que alguém está a caminho
    io.to(`cliente_${ocorrencia.usuario_id}`).emit('OCORRENCIA_EM_ANDAMENTO', {
      ocorrenciaId,
      brigadista
    })

    console.log(`✅ Ocorrência #${ocorrenciaId} assumida pelo brigadista ${brigadista_id}`)
    res.json({ sucesso: true })
  })


  // ===============================
  // LISTAR
  // ===============================
  router.get('/', (req, res) => {
    const { status } = req.query
    const rows = status
      ? db.prepare(`SELECT * FROM ocorrencia WHERE status = ? ORDER BY criado_em DESC`).all(status)
      : db.prepare(`SELECT * FROM ocorrencia ORDER BY criado_em DESC`).all()
    res.json(rows)
  })


  // ===============================
  // FINALIZAR OCORRÊNCIA
  // ===============================
  router.post('/:id/finalizada', (req, res) => {
    try {
      const { descricao } = req.body
      const ocorrenciaId = req.params.id

      const ocorrencia = db.prepare(`
        SELECT usuario_id, brigadista_id FROM ocorrencia WHERE id = ?
      `).get(ocorrenciaId)

      finalizarOcorrencia(ocorrenciaId, descricao)

      // 🔓 Libera brigadista no Map de presença
      const brigadistasOnline = getBrigadistasOnline()
      const brigadista = brigadistasOnline.get(ocorrencia.brigadista_id)
      if (brigadista) {
        brigadista.ocupado = false
      }

      // 🔔 Notifica o cliente que a ocorrência foi encerrada
      io.to(`cliente_${ocorrencia.usuario_id}`).emit('OCORRENCIA_FINALIZADA', { ocorrenciaId })

      console.log(`🏁 Ocorrência #${ocorrenciaId} finalizada. Verificando pendentes...`)

      // 🔄 Redistribui ocorrências que ficaram esperando para este brigadista agora livre
      redistribuirOcorrenciasPendentes(ocorrencia.brigadista_id)

      res.json({ sucesso: true })
    } catch (err) {
      res.status(400).json({ erro: err.message })
    }
  })

  return router
}

module.exports = ocorrenciasRoutes
