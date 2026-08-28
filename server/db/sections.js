const db = require('./index');
const { parseCharacter } = require('./personagem');

function listar() {
  const secoes = db.prepare('SELECT * FROM sections WHERE ativa = 1 ORDER BY position, id').all();
  return secoes.map((s) => {
    const contagem = db.prepare('SELECT COUNT(*) AS n FROM topics WHERE section_id = ?').get(s.id).n;
    const ultimoBruto = db
      .prepare(
        `SELECT t.id, t.title, t.last_activity_at AS lastActivityAt, u.username, u.avatar_path AS avatarPath,
                u.character AS characterRaw
         FROM topics t JOIN users u ON u.id = t.user_id
         WHERE t.section_id = ? ORDER BY t.last_activity_at DESC LIMIT 1`
      )
      .get(s.id);
    const { characterRaw, ...restoUltimo } = ultimoBruto || {};
    const ultimo = ultimoBruto ? { ...restoUltimo, character: parseCharacter(characterRaw) } : null;
    return { ...s, topicCount: contagem, ultimo };
  });
}

function porSlug(slug) {
  return db.prepare('SELECT * FROM sections WHERE slug = ?').get(slug);
}

function porId(id) {
  return db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
}

module.exports = { listar, porSlug, porId };
