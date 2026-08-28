const db = require('./index');
const { parseCharacter } = require('./personagem');

function comPersonagem(row) {
  const { characterRaw, ...resto } = row;
  return { ...resto, character: parseCharacter(characterRaw) };
}

function salvar({ topicId, userId, enrolacao, tiragem, visual }) {
  db.prepare(
    `INSERT INTO ratings (topic_id, user_id, enrolacao, tiragem, visual, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(topic_id, user_id) DO UPDATE SET
       enrolacao = excluded.enrolacao,
       tiragem = excluded.tiragem,
       visual = excluded.visual`
  ).run(topicId, userId, enrolacao, tiragem, visual, Date.now());
}

function minhaDe(topicId, userId) {
  if (!userId) return null;
  const r = db
    .prepare('SELECT enrolacao, tiragem, visual FROM ratings WHERE topic_id = ? AND user_id = ?')
    .get(topicId, userId);
  return r || null;
}

function minhasDe(userId, topicIds) {
  if (!userId || !topicIds.length) return new Map();
  const marcas = topicIds.map(() => '?').join(',');
  const linhas = db
    .prepare(
      `SELECT topic_id AS topicId, enrolacao, tiragem, visual
       FROM ratings WHERE user_id = ? AND topic_id IN (${marcas})`
    )
    .all(userId, ...topicIds);
  return new Map(linhas.map((l) => [l.topicId, { enrolacao: l.enrolacao, tiragem: l.tiragem, visual: l.visual }]));
}

// Ranking: quem mais capturou e quem tem a melhor média.
function topCapturadores(limite = 10) {
  return db
    .prepare(
      `SELECT u.username, u.avatar_path AS avatarPath, u.accent, u.character AS characterRaw, COUNT(*) AS total
       FROM topics t JOIN users u ON u.id = t.user_id
       WHERE t.kind = 'captura'
       GROUP BY t.user_id ORDER BY total DESC, u.username LIMIT ?`
    )
    .all(limite)
    .map(comPersonagem);
}

function topAvaliados(limite = 10, minimo = 1) {
  return db
    .prepare(
      `SELECT u.username, u.avatar_path AS avatarPath, u.accent, u.character AS characterRaw,
              AVG((r.enrolacao + r.tiragem + r.visual) / 3.0) AS media,
              COUNT(*) AS avaliacoes
       FROM ratings r
       JOIN topics t ON t.id = r.topic_id
       JOIN users u ON u.id = t.user_id
       GROUP BY t.user_id HAVING COUNT(*) >= ?
       ORDER BY media DESC, avaliacoes DESC LIMIT ?`
    )
    .all(minimo, limite)
    .map((r) => ({ ...comPersonagem(r), media: Number(r.media) }));
}

function topCurtidos(limite = 10) {
  return db
    .prepare(
      `SELECT u.username, u.avatar_path AS avatarPath, u.accent, u.character AS characterRaw,
              COALESCE(SUM(t.like_count), 0) AS curtidas
       FROM topics t JOIN users u ON u.id = t.user_id
       GROUP BY t.user_id HAVING curtidas > 0
       ORDER BY curtidas DESC LIMIT ?`
    )
    .all(limite)
    .map(comPersonagem);
}

module.exports = { salvar, minhaDe, minhasDe, topCapturadores, topAvaliados, topCurtidos };
