const sequelize = require('./db')
require('./models')

async function initDB() {
  try {
    await sequelize.authenticate()
    await sequelize.sync()
    console.log('✅ Banco de dados conectado via Sequelize (PostgreSQL)')
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err)
    process.exit(1)
  }
}

module.exports = { initDB }
