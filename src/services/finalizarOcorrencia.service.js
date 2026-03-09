const { Ocorrencia, LogOcorrencia } = require('../db/models')
const sequelize = require('../db/db')

async function finalizarOcorrencia(ocorrenciaId, descricao) {
  if (!descricao) throw new Error('Descrição é obrigatória')

  await sequelize.transaction(async (t) => {
    const [count] = await Ocorrencia.update(
      { status: 'FINALIZADA', finalizado_em: new Date() },
      { where: { id: ocorrenciaId }, transaction: t }
    )
    if (count === 0) throw new Error('Ocorrência não encontrada')

    await LogOcorrencia.create({ ocorrencia_id: ocorrenciaId, descricao }, { transaction: t })
  })
}

module.exports = { finalizarOcorrencia }
