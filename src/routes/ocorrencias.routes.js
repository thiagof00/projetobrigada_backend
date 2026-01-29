const express = require('express')
const db = require('../db/db')
const { finalizarOcorrencia } = require('../services/finalizarOcorrencia.service')
const router = express.Router()

// ABRIR SOS
router.post('/', (req, res) => {
  const { usuario_id, latitude, longitude } = req.body

  const result = db.prepare(`
    INSERT INTO ocorrencia (usuario_id, latitude, longitude)
    VALUES (?, ?, ?)
  `).run(usuario_id, latitude, longitude)

  res.json({ id: result.lastInsertRowid })
})

// LISTAR
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT * FROM ocorrencia`).all()
  res.json(rows)
})

// ALTERAR STATUS ANDAMENTO
router.patch('/:id/status', (req, res) => {
  const { status } = req.body
  db.prepare(`
    UPDATE ocorrencia SET status = ?
    WHERE id = ?
  `).run(status, req.params.id)

  res.json({ sucesso: true })
})

router.post('/:id/finalizada', (req, res) => {
  try {
    const { descricao } = req.body;

    finalizarOcorrencia(req.params.id, descricao);

    res.json({ sucesso: true });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

module.exports = router
