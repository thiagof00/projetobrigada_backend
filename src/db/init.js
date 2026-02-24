const db = require('./db')

db.exec(`
CREATE TABLE IF NOT EXISTS usuario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  cpf TEXT UNIQUE NOT NULL,
  telefone TEXT NOT NULL,
  perfil TEXT CHECK(perfil IN ('CIVIL','BRIGADA','INTERNO')) NOT NULL,
  ativo INTEGER DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispositivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  uuid TEXT NOT NULL,
  descricao TEXT,
  ativo INTEGER DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS ocorrencia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  brigadista_id INTEGER,
  latitude REAL,
  longitude REAL,
  status TEXT CHECK(status IN ('ABERTA','EM_ATENDIMENTO','FINALIZADA')) DEFAULT 'ABERTA',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  finalizado_em DATETIME,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

CREATE TABLE IF NOT EXISTS usuario_ocorrencia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  ocorrencia_id INTEGER NOT NULL,
  papel TEXT CHECK(papel IN ('BRIGADA','INTERNO')),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencia(id)
);

CREATE TABLE IF NOT EXISTS log_ocorrencia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ocorrencia_id INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencia(id)
);
`)

console.log('Banco inicializado')
