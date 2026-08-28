const db = require('./index');
const { parseCharacter } = require('./personagem');

const SELECT_RESPOSTA = `
  SELECT r.id, r.topic_id AS topicId, r.user_id AS userId, r.body,
         r.like_count AS likeCount, r.is_answer AS isAnswer, r.created_at AS createdAt,
         u.username, u.avatar_path AS avatarPath, u.accent, u.character AS characterRaw
  FROM replies r JOIN users u ON u.id = r.user_id
`;

function formatar(r) {
  if (!r) return null;
  const { characterRaw, ...resto } = r;
  return { ...resto, character: parseCharacter(characterRaw), isAnswer: !!r.isAnswer };
}

function criar({ topicId, userId, body }) {
  const agora = Date.now();
  const info = db
    .prepare('INSERT INTO replies (topic_id, user_id, body, created_at) VALUES (?, ?, ?, ?)')
    .run(topicId, userId, body, agora);
  db.prepare('UPDATE topics SET reply_count = reply_count + 1, last_activity_at = ? WHERE id = ?').run(agora, topicId);
  return Number(info.lastInsertRowid);
}

function porId(id) {
  return formatar(db.prepare(`${SELECT_RESPOSTA} WHERE r.id = ?`).get(id));
}

function doTopico(topicId) {
  return db
    .prepare(`${SELECT_RESPOSTA} WHERE r.topic_id = ? ORDER BY r.is_answer DESC, r.created_at ASC`)
    .all(topicId)
    .map(formatar);
}

function doUsuario(userId, limite = 30) {
  return db
    .prepare(
      `SELECT r.id, r.body, r.created_at AS createdAt, r.like_count AS likeCount,
              t.id AS topicId, t.title AS topicTitle, s.emoji AS sectionEmoji, s.slug AS sectionSlug
       FROM replies r
       JOIN topics t ON t.id = r.topic_id
       JOIN sections s ON s.id = t.section_id
       WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT ?`
    )
    .all(userId, limite);
}

function marcarResposta(topicId, replyId) {
  db.prepare('UPDATE replies SET is_answer = 0 WHERE topic_id = ?').run(topicId);
  if (replyId) db.prepare('UPDATE replies SET is_answer = 1 WHERE id = ?').run(replyId);
  db.prepare('UPDATE topics SET solved = ? WHERE id = ?').run(replyId ? 1 : 0, topicId);
}

function apagar(id) {
  const r = db.prepare('SELECT topic_id AS topicId FROM replies WHERE id = ?').get(id);
  if (!r) return;
  db.prepare('DELETE FROM replies WHERE id = ?').run(id);
  db.prepare('UPDATE topics SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?').run(r.topicId);
}

function donoDe(id) {
  const row = db.prepare('SELECT user_id AS userId FROM replies WHERE id = ?').get(id);
  return row ? row.userId : null;
}

module.exports = { criar, porId, doTopico, doUsuario, marcarResposta, apagar, donoDe };
