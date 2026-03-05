const express = require('express')
const prisma = require('../db/db')
const router = express.Router()

// CREATE
router.post('/', async (req, res) => {
  const { nome, cpf, email, telefone, perfil } = req.body
  const usuario = await prisma.usuario.create({
    data: { nome, cpf, email, telefone, perfil }
  })
  res.json({ id: usuario.id })
})

// READ ALL
router.get('/', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    where: { ativo: true }
  })
  res.json(usuarios)
})

// READ ONE
router.get('/:id', async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(req.params.id) }
  })
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })
  res.json(usuario)
})

// UPDATE
router.put('/:id', async (req, res) => {
  const { nome, email, telefone, ativo } = req.body
  await prisma.usuario.update({
    where: { id: Number(req.params.id) },
    data: { nome, email, telefone, ativo: Boolean(ativo) }
  })
  res.json({ sucesso: true })
})

// DELETE (soft)
router.delete('/:id', async (req, res) => {
  await prisma.usuario.update({
    where: { id: Number(req.params.id) },
    data: { ativo: false }
  })
  res.json({ sucesso: true })
})

module.exports = router
