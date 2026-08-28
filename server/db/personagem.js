// Acesso ao sistema de personagens: catálogo (categorias + itens) e a
// configuração equipada de cada usuário (que mora numa coluna JSON só —
// "character" na tabela users — guardando apenas os slugs equipados, não
// nenhuma imagem final renderizada).

const db = require('./index');

function categorias() {
  return db.prepare('SELECT id, slug, name, tipo, camada, posicao FROM character_categories ORDER BY posicao, id').all();
}

function itensAtivos() {
  return db
    .prepare(
      `SELECT i.id, i.slug, i.name, i.asset, i.raridade, i.desbloqueado_padrao AS desbloqueadoPadrao, i.posicao,
              c.slug AS categoriaSlug
       FROM character_items i JOIN character_categories c ON c.id = i.category_id
       WHERE i.ativo = 1
       ORDER BY c.posicao, i.posicao, i.id`
    )
    .all();
}

// Catálogo pronto pro editor: categorias com os itens já dentro, e cada
// item já com a flag `desbloqueado` calculada (hoje isso é só o padrão —
// no futuro dá pra levar em conta desbloqueios por usuário sem mexer no
// resto do sistema).
function catalogo() {
  const cats = categorias();
  const itens = itensAtivos();
  return cats.map((c) => ({
    ...c,
    itens: itens
      .filter((i) => i.categoriaSlug === c.slug)
      .map((i) => ({
        id: i.id,
        slug: i.slug,
        name: i.name,
        asset: i.asset,
        raridade: i.raridade,
        posicao: i.posicao,
        desbloqueado: !!i.desbloqueadoPadrao,
      })),
  }));
}

// Mapa rápido pra validar: categoriaSlug -> Set de itemSlugs válidos (ativos
// e desbloqueados).
function indiceValidos() {
  const mapa = new Map();
  for (const i of itensAtivos()) {
    if (!i.desbloqueadoPadrao) continue;
    if (!mapa.has(i.categoriaSlug)) mapa.set(i.categoriaSlug, new Set());
    mapa.get(i.categoriaSlug).add(i.slug);
  }
  return mapa;
}

function parseCharacter(bruto) {
  if (!bruto) return null;
  try {
    const obj = JSON.parse(bruto);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

function configDoUsuario(userId) {
  const row = db.prepare('SELECT character FROM users WHERE id = ?').get(userId);
  return row ? parseCharacter(row.character) : null;
}

// Valida a config recebida contra o catálogo de verdade e salva só o que
// bate (categoria existe e o item está ativo/desbloqueado nela). Categorias
// desconhecidas ou com item inválido são ignoradas silenciosamente — assim
// um catálogo mais novo no futuro não quebra configs salvas antes.
function salvarConfig(userId, entrada) {
  if (!entrada || typeof entrada !== 'object') entrada = {};
  const validos = indiceValidos();
  const limpo = {};
  for (const [categoriaSlug, itemSlug] of Object.entries(entrada)) {
    if (!itemSlug) continue;
    const set = validos.get(categoriaSlug);
    if (set && set.has(itemSlug)) limpo[categoriaSlug] = itemSlug;
  }
  const json = Object.keys(limpo).length ? JSON.stringify(limpo) : null;
  db.prepare('UPDATE users SET character = ? WHERE id = ?').run(json, userId);
  return limpo;
}

module.exports = { categorias, itensAtivos, catalogo, parseCharacter, configDoUsuario, salvarConfig };
