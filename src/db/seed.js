const { Usuario, Dispositivo, Ocorrencia, LogOcorrencia, UsuarioOcorrencia } = require('./models')
const sequelize = require('./db')

async function seed() {
  await sequelize.sync()

  await LogOcorrencia.destroy({ where: {} })
  await UsuarioOcorrencia.destroy({ where: {} })
  await Ocorrencia.destroy({ where: {} })
  await Dispositivo.destroy({ where: {} })
  await Usuario.destroy({ where: {} })

  const civil = await Usuario.create({ nome: 'Vitorya Canabarro', cpf: '00221552014', telefone: '55984280556', email: 'joao@email.com', perfil: 'CIVIL' })
  await Usuario.create({ nome: 'Thiago Ribeiro', cpf: '04570115055', telefone: '51984280556', email: 'brigada@email.com', perfil: 'BRIGADA' })
  await Usuario.create({ nome: 'Operador Interno', cpf: '44116613061', telefone: '54984280556', email: 'interno@email.com', perfil: 'INTERNO' })

  await Dispositivo.create({ usuario_id: civil.id, uuid: 'UUID-123456', descricao: 'Celular principal' })

  const ocorrencia = await Ocorrencia.create({ usuario_id: civil.id, latitude: -23.5505, longitude: -46.6333 })

  await LogOcorrencia.create({ ocorrencia_id: ocorrencia.id, descricao: 'Ocorrência criada via seed' })

  console.log('🌱 Seed executado com sucesso')
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => sequelize.close())
