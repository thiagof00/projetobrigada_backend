const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')

const { setupPresence } = require('./sockets/presence')
const ocorrenciasRoutes = require('./routes/ocorrencias.routes')

require('./db/init')

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*' }
})

app.use(express.json())

// ativa controle de presença
setupPresence(io)

// usa rotas passando io
app.use('/ocorrencias', ocorrenciasRoutes(io))
app.use('/usuarios', require('./routes/usuarios.routes'))
app.use('/logs', require('./routes/logs.routes'))




server.listen(3432, () => {
  console.log('🚨 API SOS rodando com WebSocket')
})