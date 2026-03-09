const express = require('express')
const { LogOcorrencia } = require('../db/models')
const router = express.Router()

router.post('/', async (req, res) => {
  const { ocorrencia_id, descricao } = req.body
  await LogOcorrencia.create({ ocorrencia_id, descricao })
  res.json({ sucesso: true })
})

router.get('/:ocorrencia_id', async (req, res) => {
  const logs = await LogOcorrencia.findAll({ where: { ocorrencia_id: req.params.ocorrencia_id } })
  res.json(logs)
})

module.exports = router
