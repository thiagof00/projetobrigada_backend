const express = require('express')
const db = require('../db/db')
const router = express.Router()

// CREATE
router.post('/', (req, res) => {
  const { nome, cpf, email, telefone, perfil } = req.body
  const result = db.prepare(`
    INSERT INTO usuario (nome, cpf, email, telefone, perfil)
    VALUES (?, ?, ?, ?, ?)
  `).run(nome, cpf ,email, telefone, perfil)

  res.json({ id: result.lastInsertRowid })
})

// READ ALL
router.get('/', (req, res) => {
  const usuarios = db.prepare(`SELECT * FROM usuario WHERE ativo = 1`).all()
  res.json(usuarios)
})

// READ ONE
router.get('/:id', (req, res) => {
  const usuario = db.prepare(`SELECT * FROM usuario WHERE id = ?`).get(req.params.id)
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' })
  res.json(usuario)
})

// UPDATE
router.put('/:id', (req, res) => {
  const { nome, email, telefone, ativo } = req.body
  db.prepare(`
    UPDATE usuario SET nome=?, email=?, telefone=?, ativo=?
    WHERE id=?
  `).run(nome, email, telefone, ativo ? 1 : 0, req.params.id)

  res.json({ sucesso: true })
})

// DELETE (soft)
router.delete('/:id', (req, res) => {
  db.prepare(`UPDATE usuario SET ativo = 0 WHERE id = ?`).run(req.params.id)
  res.json({ sucesso: true })
})

module.exports = router
