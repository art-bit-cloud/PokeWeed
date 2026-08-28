const db = require('./index');
const { parseCharacter } = require('./personagem');

const CAMPOS_PUBLICOS = `
  u.id, u.username, u.avatar_path AS avatarPath, u.banner_path AS bannerPath,
  u.bio, u.status, u.accent, u.music_url AS musicUrl, u.music_provider AS musicProvider,
  u.music_embed AS musicEmbed, u.music_title AS musicTitle,
  u.character AS characterRaw,
  u.created_at AS createdAt, u.last_seen_at AS lastSeenAt
`;

// Troca a coluna crua (JSON em texto) pelo personagem já interpretado.
function comPersonagem(u) {
  if (!u) return u;
  const { characterRaw, ...resto } = u;
  return { ...resto, character: parseCharacter(characterRaw) };
}

function criar({ username, passwordHash, salt }) {
  const info = db
    .prepare('INSERT INTO users (username, password_hash, salt, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .run(username, passwordHash, salt, Date.now(), Date.now());
  return Number(info.lastInsertRowid);
}

function porUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function porId(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Perfil público (sem hash de senha), com os números do usuário.
function perfil(username) {
  const u = db.prepare(`SELECT ${CAMPOS_PUBLICOS} FROM users u WHERE u.username = ?`).get(username);
  if (!u) return null;

  const capturas = db
    .prepare("SELECT COUNT(*) AS n FROM topics WHERE user_id = ? AND kind = 'captura'")
    .get(u.id).n;
  const topicos = db.prepare('SELECT COUNT(*) AS n FROM topics WHERE user_id = ?').get(u.id).n;
  const respostas = db.prepare('SELECT COUNT(*) AS n FROM replies WHERE user_id = ?').get(u.id).n;
  const curtidasRecebidas =
    db.prepare('SELECT COALESCE(SUM(like_count), 0) AS n FROM topics WHERE user_id = ?').get(u.id).n +
    db.prepare('SELECT COALESCE(SUM(like_count), 0) AS n FROM replies WHERE user_id = ?').get(u.id).n;

  const media = db
    .prepare(
      `SELECT AVG((r.enrolacao + r.tiragem + r.visual) / 3.0) AS m, COUNT(*) AS n
       FROM ratings r JOIN topics t ON t.id = r.topic_id
       WHERE t.user_id = ?`
    )
    .get(u.id);

  return {
    ...comPersonagem(u),
    stats: {
      capturas,
      topicos,
      respostas,
      curtidasRecebidas,
      notaMedia: media.m !== null ? Number(media.m) : null,
      avaliacoesRecebidas: media.n,
    },
  };
}

function atualizarPerfil(id, campos) {
  const permitidos = [
    'avatar_path',
    'banner_path',
    'bio',
    'status',
    'accent',
    'music_url',
    'music_provider',
    'music_embed',
    'music_title',
  ];
  const entradas = Object.entries(campos).filter(([k]) => permitidos.includes(k));
  if (!entradas.length) return;
  const sets = entradas.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...entradas.map(([, v]) => v), id);
}

function marcarVisto(id) {
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(Date.now(), id);
}

function buscar(termo, limite = 20) {
  return db
    .prepare(`SELECT ${CAMPOS_PUBLICOS} FROM users u WHERE u.username LIKE ? ORDER BY u.username LIMIT ?`)
    .all(`%${termo}%`, limite)
    .map(comPersonagem);
}

function listar(limite = 100) {
  return db
    .prepare(`SELECT ${CAMPOS_PUBLICOS} FROM users u ORDER BY u.created_at LIMIT ?`)
    .all(limite)
    .map(comPersonagem);
}

// ---------- sessões ----------
function criarSessao(token, userId, ttlMs) {
  const agora = Date.now();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    agora,
    agora + ttlMs
  );
}

function pegarSessao(token) {
  const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!s) return null;
  if (s.expires_at < Date.now()) {
    apagarSessao(token);
    return null;
  }
  return s;
}

function apagarSessao(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

module.exports = {
  criar,
  porUsername,
  porId,
  perfil,
  atualizarPerfil,
  marcarVisto,
  buscar,
  listar,
  criarSessao,
  pegarSessao,
  apagarSessao,
};
