const prisma = require('./db')

async function initDB() {
  try {
    await prisma.$connect()
    console.log('✅ Banco de dados conectado via Prisma (PostgreSQL)')
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err)
    process.exit(1)
  }
}

module.exports = { initDB }
