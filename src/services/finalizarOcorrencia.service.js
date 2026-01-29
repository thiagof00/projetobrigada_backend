const db = require("../db/db");

const finalizarOcorrencia = db.transaction((ocorrenciaId, descricao) => {
  if (!descricao) {
    throw new Error("Descrição é obrigatória");
  }

  const update = db.prepare(`
    UPDATE ocorrencia
    SET status = ?, finalizado_em = ?
    WHERE id = ?
  `).run("FINALIZADA", new Date().toISOString(), ocorrenciaId);

  if (update.changes === 0) {
    throw new Error("Ocorrência não encontrada");
  }

  db.prepare(`
    INSERT INTO log_ocorrencia (ocorrencia_id, descricao)
    VALUES (?, ?)
  `).run(ocorrenciaId, descricao);
});

module.exports = { finalizarOcorrencia };
