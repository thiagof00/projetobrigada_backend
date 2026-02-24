const express = require('express')
const db = require('../db/db')
const { finalizarOcorrencia } = require('../services/finalizarOcorrencia.service')
const { getBrigadistasOnline } = require('../sockets/presence')

function ocorrenciasRoutes(io) {
  const router = express.Router()

  // ===============================
  // ABRIR OCORRÊNCIA (BROADCAST)
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

    const brigadistasOnline = getBrigadistasOnline()

    // 🔔 envia para todos brigadistas online e livres
    for (const [, data] of brigadistasOnline.entries()) {
      if (!data.ocupado) {
        io.to(data.socketId).emit('NOVA_OCORRENCIA', {
          ocorrenciaId,
          latitude,
          longitude
        })
      }
    }

    res.json({ sucesso: true, ocorrenciaId })
  })


  // ===============================
  // ACEITAR OCORRÊNCIA
  // ===============================
  router.patch('/:id/status', (req, res) => {
    const { brigadista_id } = req.body
    const ocorrenciaId = req.params.id

    // 🔐 garante que apenas 1 brigadista assume
    const result = db.prepare(`
      UPDATE ocorrencia
      SET status = 'EM_ATENDIMENTO',
          brigadista_id = ?
      WHERE id = ? AND status = 'ABERTA'
    `).run(brigadista_id, ocorrenciaId)

    if (result.changes === 0) {
      return res.status(400).json({
        erro: 'Ocorrência já foi assumida'
      })
    }

    // 🔎 busca dados do brigadista
    const brigadista = db.prepare(`
      SELECT id, nome, telefone
      FROM usuario
      WHERE id = ?
    `).get(brigadista_id)

    // 🔒 marca brigadista como ocupado
    const brigadistasOnline = getBrigadistasOnline()
    const brigadistaOnline = brigadistasOnline.get(brigadista_id)

    if (brigadistaOnline) {
      brigadistaOnline.ocupado = true
    }

    // 🔎 pega cliente dono da ocorrência
    const ocorrencia = db.prepare(`
      SELECT usuario_id
      FROM ocorrencia
      WHERE id = ?
    `).get(ocorrenciaId)

    // 🔔 notifica cliente (room)
    io.to(`cliente_${ocorrencia.usuario_id}`).emit(
      'OCORRENCIA_EM_ANDAMENTO',
      {
        ocorrenciaId,
        brigadista
      }
    )

    res.json({ sucesso: true })
  })


  // ===============================
  // LISTAR
  // ===============================
  router.get('/', (req, res) => {
    const rows = db.prepare(`SELECT * FROM ocorrencia`).all()
    res.json(rows)
  })


  // ===============================
  // FINALIZAR OCORRÊNCIA
  // ===============================
  router.post('/:id/finalizada', (req, res) => {
    try {
      const { descricao } = req.body
      const ocorrenciaId = req.params.id

      finalizarOcorrencia(ocorrenciaId, descricao)

      const ocorrencia = db.prepare(`
        SELECT usuario_id, brigadista_id
        FROM ocorrencia
        WHERE id = ?
      `).get(ocorrenciaId)

      // 🔓 libera brigadista
      const brigadistasOnline = getBrigadistasOnline()
      const brigadista = brigadistasOnline.get(ocorrencia.brigadista_id)

      if (brigadista) {
        brigadista.ocupado = false
      }

      // 🔔 notifica cliente
      io.to(`cliente_${ocorrencia.usuario_id}`).emit(
        'OCORRENCIA_FINALIZADA',
        { ocorrenciaId }
      )

      res.json({ sucesso: true })
    } catch (err) {
      res.status(400).json({ erro: err.message })
    }
  })

  return router
}

module.exports = ocorrenciasRoutes