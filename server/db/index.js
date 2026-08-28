// Conexão com o SQLite (node:sqlite, embutido no Node — sem dependência de
// banco externo e sem compilar nada) + criação do schema e das seções iniciais.

const { DatabaseSync } = require('node:sqlite');
const { DB_PATH } = require('../dados');

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    avatar_path TEXT,
    banner_path TEXT,
    bio TEXT,
    status TEXT,
    accent TEXT,
    music_url TEXT,
    music_provider TEXT,
    music_embed TEXT,
    music_title TEXT,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    description TEXT,
    kind TEXT NOT NULL DEFAULT 'texto',
    position INTEGER NOT NULL DEFAULT 0,
    ativa INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    kind TEXT NOT NULL DEFAULT 'texto',
    photo_path TEXT,
    category TEXT,
    quantity TEXT,
    video_path TEXT,
    video_embed TEXT,
    video_thumb TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    solved INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    last_activity_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    like_count INTEGER NOT NULL DEFAULT 0,
    is_answer INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, target_type, target_id)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolacao INTEGER NOT NULL,
    tiragem INTEGER NOT NULL,
    visual INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (topic_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_topics_section ON topics(section_id, last_activity_at DESC);
  CREATE INDEX IF NOT EXISTS idx_topics_user ON topics(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_replies_topic ON replies(topic_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_replies_user ON replies(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  -- Sistema de personagens: catálogo de categorias (abas/camadas) e itens
  -- (peças). O que cada usuário tem equipado NÃO mora aqui — fica numa
  -- coluna JSON em "users" (só os slugs equipados, sem imagem nenhuma
  -- salva), pra não precisar de join nenhum pra mostrar um personagem em
  -- listagem nenhuma do site.
  CREATE TABLE IF NOT EXISTS character_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'visual',
    camada INTEGER NOT NULL DEFAULT 0,
    posicao INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS character_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES character_categories(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    asset TEXT,
    raridade TEXT NOT NULL DEFAULT 'comum',
    desbloqueado_padrao INTEGER NOT NULL DEFAULT 1,
    posicao INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    UNIQUE(category_id, slug)
  );
`);

// Seções iniciais. São criadas só se ainda não existirem, então dá pra
// renomear/reordenar depois no banco sem que voltem sozinhas.
const SECOES_PADRAO = [
  {
    slug: 'capturas',
    name: 'Capturas',
    emoji: '📸',
    description: 'Registre seu beck ou cota e receba nota da galera.',
    kind: 'captura',
    position: 1,
  },
  {
    slug: 'tutoriais',
    name: 'Tutoriais',
    emoji: '🎥',
    description: 'Vídeos ensinando alguma coisa: enrolar, misturar, o que for.',
    kind: 'video',
    position: 2,
  },
  {
    slug: 'duvidas',
    name: 'Dúvidas',
    emoji: '❓',
    description: 'Pergunte que alguém do bonde responde. Marque a melhor resposta.',
    kind: 'texto',
    position: 3,
  },
  {
    slug: 'geral',
    name: 'Papo geral',
    emoji: '💬',
    description: 'Assunto livre.',
    kind: 'texto',
    position: 4,
  },
];

const inserirSecao = db.prepare(
  `INSERT OR IGNORE INTO sections (slug, name, emoji, description, kind, position)
   VALUES (?, ?, ?, ?, ?, ?)`
);
for (const s of SECOES_PADRAO) {
  inserirSecao.run(s.slug, s.name, s.emoji, s.description, s.kind, s.position);
}

// Migração leve: acrescenta colunas novas em bancos criados por versões
// anteriores, sem perder nada do que já está lá.
function garantirColuna(tabela, coluna, definicao) {
  const colunas = db.prepare(`PRAGMA table_info(${tabela})`).all();
  if (!colunas.some((c) => c.name === coluna)) {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
  }
}
for (const [coluna, def] of Object.entries({
  banner_path: 'TEXT',
  bio: 'TEXT',
  status: 'TEXT',
  accent: 'TEXT',
  music_url: 'TEXT',
  music_provider: 'TEXT',
  music_embed: 'TEXT',
  music_title: 'TEXT',
  last_seen_at: 'INTEGER',
  character: 'TEXT',
})) {
  garantirColuna('users', coluna, def);
}
garantirColuna('sections', 'ativa', "INTEGER NOT NULL DEFAULT 1");

// A seção "Zoeira" saiu do time-padrão. Em vez de apagar (e perder tópicos
// que já existam nela), só desativa — ela some das listas mas nada é
// destruído. Pra reativar, é só voltar "ativa" pra 1 direto no banco.
db.exec(`UPDATE sections SET ativa = 0 WHERE slug = 'zoeira'`);

// Catálogo do sistema de personagens. Mesmo esquema das seções: só insere
// o que ainda não existe (por slug), então dá pra editar nome/asset/ordem
// direto no banco depois sem que a semente sobrescreva.
const { CATEGORIAS: CATEGORIAS_PERSONAGEM, ITENS: ITENS_PERSONAGEM } = require('./personagem-catalogo');

const inserirCategoria = db.prepare(
  `INSERT OR IGNORE INTO character_categories (slug, name, tipo, camada, posicao) VALUES (?, ?, ?, ?, ?)`
);
for (const c of CATEGORIAS_PERSONAGEM) {
  inserirCategoria.run(c.slug, c.name, c.tipo, c.camada, c.posicao);
}

const pegarCategoriaId = db.prepare('SELECT id FROM character_categories WHERE slug = ?');
const inserirItem = db.prepare(
  `INSERT OR IGNORE INTO character_items (category_id, slug, name, asset, raridade, desbloqueado_padrao, posicao)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
for (const i of ITENS_PERSONAGEM) {
  const cat = pegarCategoriaId.get(i.categoria);
  if (!cat) continue; // categoria desconhecida no catálogo — ignora em vez de quebrar o boot
  inserirItem.run(cat.id, i.slug, i.name, i.asset, i.raridade || 'comum', 1, i.posicao || 0);
}

module.exports = db;
