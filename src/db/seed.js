const prisma = require('./db')

async function seed() {
  // Limpa dados
  await prisma.logOcorrencia.deleteMany()
  await prisma.usuarioOcorrencia.deleteMany()
  await prisma.ocorrencia.deleteMany()
  await prisma.dispositivo.deleteMany()
  await prisma.usuario.deleteMany()

  // Usuários
  const civil = await prisma.usuario.create({
    data: { nome: 'Vitorya Canabarro', cpf: '00221552014', telefone: '55984280556', email: 'joao@email.com', perfil: 'CIVIL' }
  })
  await prisma.usuario.create({
    data: { nome: 'Thiago Ribeiro', cpf: '04570115055', telefone: '51984280556', email: 'brigada@email.com', perfil: 'BRIGADA' }
  })
  await prisma.usuario.create({
    data: { nome: 'Operador Interno', cpf: '44116613061', telefone: '54984280556', email: 'interno@email.com', perfil: 'INTERNO' }
  })

  // Dispositivo
  await prisma.dispositivo.create({
    data: { usuario_id: civil.id, uuid: 'UUID-123456', descricao: 'Celular principal' }
  })

  // Ocorrência
  const ocorrencia = await prisma.ocorrencia.create({
    data: { usuario_id: civil.id, latitude: -23.5505, longitude: -46.6333 }
  })

  // Log
  await prisma.logOcorrencia.create({
    data: { ocorrencia_id: ocorrencia.id, descricao: 'Ocorrência criada via seed' }
  })

  console.log('🌱 Seed executado com sucesso')
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
