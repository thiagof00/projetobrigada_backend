const { calcularDistancia } = require('./distance')
const { getBrigadistasOnline } = require('../sockets/presence')

/**
 * Retorna lista de brigadistas livres ordenados por proximidade.
 * Pode ignorar IDs já tentados.
 */
function encontrarBrigadistaMaisProximo(
  latitude,
  longitude,
  raioMaxKm = 50,
  ignorados = new Set()
) {
  const brigadistasOnline = getBrigadistasOnline()

  const candidatosComLocalizacao = []
  const candidatosSemLocalizacao = []

  for (const [userId, data] of brigadistasOnline.entries()) {
    if (data.ocupado) continue
    if (data.notificadoOcorrencia != null) continue
    if (ignorados.has(userId)) continue

    // sem localização → fallback
    if (!data.latitude || !data.longitude) {
      candidatosSemLocalizacao.push({
        userId,
        socketId: data.socketId,
        distancia: null
      })
      continue
    }

    const distancia = calcularDistancia(
      latitude,
      longitude,
      data.latitude,
      data.longitude
    )

    if (distancia > raioMaxKm) continue

    candidatosComLocalizacao.push({
      userId,
      socketId: data.socketId,
      distancia
    })
  }

  // ordena por distância
  candidatosComLocalizacao.sort((a, b) => a.distancia - b.distancia)

  // retorna todos (primeiro os com localização, depois fallback)
  return [...candidatosComLocalizacao, ...candidatosSemLocalizacao]
}

module.exports = { encontrarBrigadistaMaisProximo }