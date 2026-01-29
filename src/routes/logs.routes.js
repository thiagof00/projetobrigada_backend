const express = require('express')
const db = require('../db/db')
const router = express.Router()

router.post('/', (req, res) => {
  const { ocorrencia_id, descricao } = req.body

  db.prepare(`
    INSERT INTO log_ocorrencia (ocorrencia_id, descricao)
    VALUES (?, ?)
  `).run(ocorrencia_id, descricao)

  res.json({ sucesso: true })
})

router.get('/:ocorrencia_id', (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM log_ocorrencia
    WHERE ocorrencia_id = ?
  `).all(req.params.ocorrencia_id)

  res.json(logs)
})

module.exports = router
