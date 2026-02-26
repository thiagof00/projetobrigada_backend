const { calcularDistancia } = require('./distance')
const { getBrigadistasOnline } = require('../sockets/presence')

/**
 * Retorna o brigadista livre mais próximo dentro do raio.
 * Se nenhum tiver localização registrada, retorna o primeiro livre disponível.
 */
function encontrarBrigadistaMaisProximo(latitude, longitude, raioMaxKm = 50) {
  const brigadistasOnline = getBrigadistasOnline()

  let maisProximo = null
  let menorDistancia = Infinity
  let primeiraSemLocalizacao = null

  for (const [userId, data] of brigadistasOnline.entries()) {
    if (data.ocupado) continue

    // Brigadista sem localização: guarda como fallback
    if (!data.latitude || !data.longitude) {
      if (!primeiraSemLocalizacao) {
        primeiraSemLocalizacao = { userId, socketId: data.socketId, distancia: null }
      }
      continue
    }

    const distancia = calcularDistancia(latitude, longitude, data.latitude, data.longitude)

    if (distancia > raioMaxKm) continue

    if (distancia < menorDistancia) {
      menorDistancia = distancia
      maisProximo = { userId, socketId: data.socketId, distancia }
    }
  }

  // Prefere o mais próximo com localização; fallback para qualquer um livre
  return maisProximo ?? primeiraSemLocalizacao ?? null
}

module.exports = { encontrarBrigadistaMaisProximo }
