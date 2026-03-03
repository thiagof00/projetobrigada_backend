const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
require('dotenv').config()

const { initDB } = require('./db/init')
const { setupPresence } = require('./sockets/presence')
const ocorrenciasRoutes = require('./routes/ocorrencias.routes')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*' }
})

// Ativa controle de presença
setupPresence(io)

// Rotas
app.use('/ocorrencias', ocorrenciasRoutes(io))
app.use('/usuarios', require('./routes/usuarios.routes'))
app.use('/logs', require('./routes/logs.routes'))

async function main() {
  await initDB()
  server.listen(3432, () => {
    console.log('🚨 API SOS rodando com WebSocket na porta 3432')
  })
}

main()
