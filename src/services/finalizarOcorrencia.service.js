const prisma = require("../db/db");

async function finalizarOcorrencia(ocorrenciaId, descricao) {
  if (!descricao) {
    throw new Error("Descrição é obrigatória");
  }

  await prisma.$transaction(async (tx) => {
    const update = await tx.ocorrencia.updateMany({
      where: { id: Number(ocorrenciaId) },
      data: { status: "FINALIZADA", finalizado_em: new Date() }
    });

    if (update.count === 0) {
      throw new Error("Ocorrência não encontrada");
    }

    await tx.logOcorrencia.create({
      data: { ocorrencia_id: Number(ocorrenciaId), descricao }
    });
  });
}

module.exports = { finalizarOcorrencia };
