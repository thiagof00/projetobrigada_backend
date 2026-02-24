const { calcularDistancia } = require('./distance')
const { getBrigadistasOnline } = require('../sockets/presence')

function encontrarBrigadistaMaisProximo(latitude, longitude, raioMaxKm = 50) {
  const brigadistasOnline = getBrigadistasOnline()

  let maisProximo = null
  let menorDistancia = Infinity

  for (const [userId, data] of brigadistasOnline.entries()) {

    if (data.ocupado) continue
    if (!data.latitude || !data.longitude) continue

    const distancia = calcularDistancia(
      latitude,
      longitude,
      data.latitude,
      data.longitude
    )

    if (distancia > raioMaxKm) continue

    if (distancia < menorDistancia) {
      menorDistancia = distancia
      maisProximo = {
        userId,
        socketId: data.socketId,
        distancia
      }
    }
  }

  return maisProximo
}

module.exports = { encontrarBrigadistaMaisProximo }