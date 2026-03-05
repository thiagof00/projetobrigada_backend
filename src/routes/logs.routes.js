const express = require('express')
const prisma = require('../db/db')
const router = express.Router()

router.post('/', async (req, res) => {
  const { ocorrencia_id, descricao } = req.body
  await prisma.logOcorrencia.create({
    data: { ocorrencia_id: Number(ocorrencia_id), descricao }
  })
  res.json({ sucesso: true })
})

router.get('/:ocorrencia_id', async (req, res) => {
  const logs = await prisma.logOcorrencia.findMany({
    where: { ocorrencia_id: Number(req.params.ocorrencia_id) }
  })
  res.json(logs)
})

module.exports = router
