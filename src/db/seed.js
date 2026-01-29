const db = require('./db')

// limpa dados (opcional)
db.exec(`
  DELETE FROM log_ocorrencia;
  DELETE FROM usuario_ocorrencia;
  DELETE FROM ocorrencia;
  DELETE FROM dispositivo;
  DELETE FROM usuario;
`)

// USUÁRIOS
const usuarios = [
  { nome: 'Vitorya Canabarro', cpf: "00221552014", telefone: "55984280556", email: 'joao@email.com', perfil: 'CIVIL' },
  { nome: 'Thiago Ribeiro', cpf: "04570115055", telefone: "51984280556", email: 'brigada@email.com', perfil: 'BRIGADA' },
  { nome: 'Operador Interno', cpf:"44116613061", telefone: "54984280556", email: 'interno@email.com', perfil: 'INTERNO' }
]

const insertUsuario = db.prepare(`
  INSERT INTO usuario (nome, cpf, telefone, email, perfil)
  VALUES (@nome, @cpf, @telefone, @email, @perfil)
`)

usuarios.forEach(u => insertUsuario.run(u))

// DISPOSITIVO
const user = db.prepare(`SELECT id FROM usuario WHERE perfil='CIVIL'`).get()

db.prepare(`
  INSERT INTO dispositivo (usuario_id, uuid, descricao)
  VALUES (?, ?, ?)
`).run(user.id, 'UUID-123456', 'Celular principal')

// OCORRÊNCIA
const ocorrencia = db.prepare(`
  INSERT INTO ocorrencia (usuario_id, latitude, longitude)
  VALUES (?, ?, ?)
`).run(user.id, -23.5505, -46.6333)

// LOG
db.prepare(`
  INSERT INTO log_ocorrencia (ocorrencia_id, descricao)
  VALUES (?, ?)
`).run(ocorrencia.lastInsertRowid, 'Ocorrência criada via seed')

console.log('🌱 Seed executado com sucesso')
