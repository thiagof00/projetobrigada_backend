const express = require('express')
const { Usuario } = require('../db/models')
const router = express.Router()

router.post('/', async (req, res) => {
  const { nome, cpf, email, telefone, perfil } = req.body
  const usuario = await Usuario.create({ nome, cpf, email, telefone, perfil })
  res.json({ usuario })
})

router.get('/', async (req, res) => {
  const usuarios = await Usuario.findAll({ where: { ativo: true } })
  res.json(usuarios)
})

router.get('/:id', async (req, res) => {
  const usuario = await Usuario.findByPk(req.params.id)
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })
  res.json(usuario)
})

router.put('/:id', async (req, res) => {
  const { nome, email, telefone, ativo } = req.body
  await Usuario.update({ nome, email, telefone, ativo }, { where: { id: req.params.id } })
  res.json({ sucesso: true })
})

router.delete('/:id', async (req, res) => {
  await Usuario.update({ ativo: false }, { where: { id: req.params.id } })
  res.json({ sucesso: true })
})

module.exports = router
