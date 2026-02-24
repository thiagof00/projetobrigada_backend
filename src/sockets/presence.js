const brigadistasOnline = new Map()

function setupPresence(io) {
  io.on('connection', (socket) => {

    socket.on('entrar_cliente', ({ usuarioId }) => {
      socket.join(`cliente_${usuarioId}`)
      console.log(`📱 Cliente ${usuarioId} entrou na room`)
    })


    socket.on('online', ({ usuarioId }) => {
      brigadistasOnline.set(usuarioId, {
        socketId: socket.id,
        latitude: null,
        longitude: null,
        ocupado: false,
        lastUpdate: Date.now()
      })
    })

    socket.on('localizacao', ({ usuarioId, latitude, longitude }) => {
      const brigadista = brigadistasOnline.get(usuarioId)
      if (brigadista) {
        brigadista.latitude = latitude
        brigadista.longitude = longitude
        brigadista.lastUpdate = Date.now()
      }
    })

    socket.on('desocupar', ({ usuarioId }) => {
      const brigadista = brigadistasOnline.get(usuarioId)
      if (brigadista) {
        brigadista.ocupado = false
      }
    })

    socket.on('disconnect', () => {
      for (const [userId, data] of brigadistasOnline.entries()) {
        if (data.socketId === socket.id) {
          brigadistasOnline.delete(userId)
        }
      }
    })
  })
}

function getBrigadistasOnline() {
  return brigadistasOnline
}

module.exports = {
  setupPresence,
  getBrigadistasOnline
}