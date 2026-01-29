require("dotenv").config()
const express = require("express")
const server = express()
const port = process.env.PORT_SERVER


server.use(express.json())
require('./db/init')

server.use('/usuarios', require('./routes/usuarios.routes'))
server.use('/ocorrencias', require('./routes/ocorrencias.routes'))
server.use('/logs', require('./routes/logs.routes'))

server.listen(port, () => {
  console.log(`🔥 API rodando em http://localhost:${port}`)
})