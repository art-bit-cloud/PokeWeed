const db = require('./index');

const TABELA = { topic: 'topics', reply: 'replies' };

// Curtir/descurtir num toque só. Devolve { curtiu, total }.
function alternar(userId, targetType, targetId) {
  const tabela = TABELA[targetType];
  if (!tabela) throw new Error('Tipo de alvo inválido.');

  const jaTem = db
    .prepare('SELECT 1 FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?')
    .get(userId, targetType, targetId);

  if (jaTem) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?').run(
      userId,
      targetType,
      targetId
    );
    db.prepare(`UPDATE ${tabela} SET like_count = MAX(like_count - 1, 0) WHERE id = ?`).run(targetId);
  } else {
    db.prepare('INSERT INTO likes (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)').run(
      userId,
      targetType,
      targetId,
      Date.now()
    );
    db.prepare(`UPDATE ${tabela} SET like_count = like_count + 1 WHERE id = ?`).run(targetId);
  }

  const total = db.prepare(`SELECT like_count AS n FROM ${tabela} WHERE id = ?`).get(targetId);
  return { curtiu: !jaTem, total: total ? total.n : 0 };
}

// Quais desses ids o usuário já curtiu (pra pintar o coração sem N consultas).
function meusDe(userId, targetType, ids) {
  if (!userId || !ids.length) return new Set();
  const marcas = ids.map(() => '?').join(',');
  const linhas = db
    .prepare(`SELECT target_id AS id FROM likes WHERE user_id = ? AND target_type = ? AND target_id IN (${marcas})`)
    .all(userId, targetType, ...ids);
  return new Set(linhas.map((l) => l.id));
}

module.exports = { alternar, meusDe };
