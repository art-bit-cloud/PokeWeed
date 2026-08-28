const db = require('./index');
const { parseCharacter } = require('./personagem');

// Um SELECT só, reaproveitado em toda listagem: junta autor, seção e as médias
// das notas (que só existem em tópicos do tipo "captura").
const SELECT_TOPICO = `
  SELECT
    t.id, t.section_id AS sectionId, t.user_id AS userId, t.title, t.body, t.kind,
    t.photo_path AS photoPath, t.category, t.quantity,
    t.video_path AS videoPath, t.video_embed AS videoEmbed, t.video_thumb AS videoThumb,
    t.pinned, t.solved, t.reply_count AS replyCount, t.like_count AS likeCount,
    t.view_count AS viewCount, t.last_activity_at AS lastActivityAt, t.created_at AS createdAt,
    u.username, u.avatar_path AS avatarPath, u.accent, u.character AS characterRaw,
    s.slug AS sectionSlug, s.name AS sectionName, s.emoji AS sectionEmoji, s.kind AS sectionKind,
    (SELECT COUNT(*) FROM ratings r WHERE r.topic_id = t.id) AS ratingCount,
    (SELECT AVG(r.enrolacao) FROM ratings r WHERE r.topic_id = t.id) AS avgEnrolacao,
    (SELECT AVG(r.tiragem) FROM ratings r WHERE r.topic_id = t.id) AS avgTiragem,
    (SELECT AVG(r.visual) FROM ratings r WHERE r.topic_id = t.id) AS avgVisual,
    (SELECT AVG((r.enrolacao + r.tiragem + r.visual) / 3.0) FROM ratings r WHERE r.topic_id = t.id) AS avgOverall
  FROM topics t
  JOIN users u ON u.id = t.user_id
  JOIN sections s ON s.id = t.section_id
`;

function formatar(row) {
  if (!row) return null;
  const { characterRaw, ...resto } = row;
  return {
    ...resto,
    character: parseCharacter(characterRaw),
    pinned: !!row.pinned,
    solved: !!row.solved,
    avgEnrolacao: row.avgEnrolacao === null ? null : Number(row.avgEnrolacao),
    avgTiragem: row.avgTiragem === null ? null : Number(row.avgTiragem),
    avgVisual: row.avgVisual === null ? null : Number(row.avgVisual),
    avgOverall: row.avgOverall === null ? null : Number(row.avgOverall),
  };
}

function criar(dados) {
  const agora = Date.now();
  const info = db
    .prepare(
      `INSERT INTO topics
        (section_id, user_id, title, body, kind, photo_path, category, quantity,
         video_path, video_embed, video_thumb, last_activity_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      dados.sectionId,
      dados.userId,
      dados.title,
      dados.body || null,
      dados.kind || 'texto',
      dados.photoPath || null,
      dados.category || null,
      dados.quantity || null,
      dados.videoPath || null,
      dados.videoEmbed || null,
      dados.videoThumb || null,
      agora,
      agora
    );
  return Number(info.lastInsertRowid);
}

function porId(id) {
  return formatar(db.prepare(`${SELECT_TOPICO} WHERE t.id = ?`).get(id));
}

// Lista com filtros combináveis. `ordem`: 'recentes' | 'novos' | 'populares'
function listar({ sectionId, sectionKinds, userId, kind, busca, ordem = 'recentes', limite = 30, offset = 0 } = {}) {
  const where = [];
  const params = [];

  if (sectionId) {
    where.push('t.section_id = ?');
    params.push(sectionId);
  }
  if (sectionKinds && sectionKinds.length) {
    where.push(`s.kind IN (${sectionKinds.map(() => '?').join(',')})`);
    params.push(...sectionKinds);
  }
  if (userId) {
    where.push('t.user_id = ?');
    params.push(userId);
  }
  if (kind) {
    where.push('t.kind = ?');
    params.push(kind);
  }
  if (busca) {
    where.push('(t.title LIKE ? OR t.body LIKE ? OR u.username LIKE ?)');
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }

  const ordens = {
    recentes: 't.pinned DESC, t.last_activity_at DESC',
    novos: 't.pinned DESC, t.created_at DESC',
    populares: 't.pinned DESC, (t.like_count * 2 + t.reply_count) DESC, t.created_at DESC',
  };

  const sql = `
    ${SELECT_TOPICO}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${ordens[ordem] || ordens.recentes}
    LIMIT ? OFFSET ?
  `;
  return db.prepare(sql).all(...params, limite, offset).map(formatar);
}

function contarAtividade() {
  return {
    topicos: db.prepare('SELECT COUNT(*) AS n FROM topics').get().n,
    respostas: db.prepare('SELECT COUNT(*) AS n FROM replies').get().n,
    capturas: db.prepare("SELECT COUNT(*) AS n FROM topics WHERE kind = 'captura'").get().n,
    membros: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
  };
}

function tocarAtividade(id) {
  db.prepare('UPDATE topics SET last_activity_at = ? WHERE id = ?').run(Date.now(), id);
}

function contarVisualizacao(id) {
  db.prepare('UPDATE topics SET view_count = view_count + 1 WHERE id = ?').run(id);
}

function definirFixado(id, valor) {
  db.prepare('UPDATE topics SET pinned = ? WHERE id = ?').run(valor ? 1 : 0, id);
}

function definirResolvido(id, valor) {
  db.prepare('UPDATE topics SET solved = ? WHERE id = ?').run(valor ? 1 : 0, id);
}

function apagar(id) {
  db.prepare('DELETE FROM topics WHERE id = ?').run(id);
}

function donoDe(id) {
  const row = db.prepare('SELECT user_id AS userId FROM topics WHERE id = ?').get(id);
  return row ? row.userId : null;
}

module.exports = {
  criar,
  porId,
  listar,
  contarAtividade,
  tocarAtividade,
  contarVisualizacao,
  definirFixado,
  definirResolvido,
  apagar,
  donoDe,
};
