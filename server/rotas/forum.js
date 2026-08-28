const express = require('express');

const sections = require('../db/sections');
const topics = require('../db/topics');
const replies = require('../db/replies');
const likes = require('../db/likes');
const ratings = require('../db/ratings');
const users = require('../db/users');

const { exigirLogin } = require('../lib/sessao');
const { salvarImagem, ErroDeMidia } = require('../lib/midia');
const { analisarLink } = require('../lib/embed');
const realtime = require('../lib/realtime');

const router = express.Router();

const MAX_TITULO = 120;
const MAX_CORPO = 5000;
const MAX_RESPOSTA = 3000;
const CATEGORIAS = ['Beck', 'Fininho', 'Cravo', 'Baseado', 'Charuto', 'Cota', 'Outro'];

// O primeiro cadastro do fórum é o dono: pode fixar e apagar qualquer coisa.
// Num grupo de amigos isso resolve moderação sem precisar de painel nenhum.
function ehDono(user) {
  return user && user.id === 1;
}

// Acrescenta a cada tópico o que depende de quem está olhando.
function enriquecer(lista, userId) {
  if (!lista.length) return lista;
  const ids = lista.map((t) => t.id);
  const curtidos = likes.meusDe(userId, 'topic', ids);
  const minhasNotas = ratings.minhasDe(userId, ids);
  return lista.map((t) => ({
    ...t,
    isMine: t.userId === userId,
    liked: curtidos.has(t.id),
    myRating: minhasNotas.get(t.id) || null,
  }));
}

function enriquecerRespostas(lista, userId) {
  if (!lista.length) return lista;
  const curtidos = likes.meusDe(userId, 'reply', lista.map((r) => r.id));
  return lista.map((r) => ({ ...r, isMine: r.userId === userId, liked: curtidos.has(r.id) }));
}

// ---------- seções ----------
router.get('/secoes', (req, res) => {
  res.json({ secoes: sections.listar(), categorias: CATEGORIAS });
});

// ---------- listagem de tópicos ----------
router.get('/topicos', (req, res) => {
  const { secao, kind, busca, ordem, autor } = req.query;
  const limite = Math.min(Number(req.query.limite) || 30, 60);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  let sectionId;
  if (secao) {
    const s = sections.porSlug(String(secao));
    if (!s) return res.status(404).json({ error: 'Seção não encontrada.' });
    sectionId = s.id;
  }

  let userId;
  if (autor) {
    const u = users.porUsername(String(autor));
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
    userId = u.id;
  }

  // A aba Comunidade junta as seções de vídeo e de dúvidas num lugar só.
  const sectionKinds = req.query.comunidade === '1' ? ['video', 'texto'] : undefined;

  const lista = topics.listar({
    sectionId,
    sectionKinds,
    userId,
    kind: kind ? String(kind) : undefined,
    busca: busca ? String(busca).trim() : undefined,
    ordem: ordem ? String(ordem) : 'recentes',
    limite,
    offset,
  });

  res.json({ topicos: enriquecer(lista, req.user ? req.user.id : null) });
});

// ---------- um tópico com as respostas ----------
router.get('/topicos/:id', (req, res) => {
  const id = Number(req.params.id);
  const topico = topics.porId(id);
  if (!topico) return res.status(404).json({ error: 'Tópico não encontrado.' });

  topics.contarVisualizacao(id);
  const meuId = req.user ? req.user.id : null;

  res.json({
    topico: enriquecer([topico], meuId)[0],
    respostas: enriquecerRespostas(replies.doTopico(id), meuId),
    podeModerar: ehDono(req.user),
  });
});

// ---------- criar tópico ----------
router.post('/topicos', exigirLogin, (req, res) => {
  const titulo = String(req.body.title || '').trim().slice(0, MAX_TITULO);
  const corpo = String(req.body.body || '').trim().slice(0, MAX_CORPO);
  const slug = String(req.body.secao || '').trim();

  if (!titulo) return res.status(400).json({ error: 'Dá um título pro tópico.' });

  const secao = sections.porSlug(slug);
  if (!secao) return res.status(400).json({ error: 'Escolhe uma seção.' });

  const novo = {
    sectionId: secao.id,
    userId: req.user.id,
    title: titulo,
    body: corpo || null,
    kind: 'texto',
  };

  try {
    if (secao.kind === 'captura') {
      if (!req.body.photoDataUrl) return res.status(400).json({ error: 'Faltou a foto da captura.' });
      novo.kind = 'captura';
      novo.photoPath = salvarImagem(req.body.photoDataUrl, 'fotos');
      novo.category = CATEGORIAS.includes(req.body.category) ? req.body.category : 'Outro';
      novo.quantity = String(req.body.quantity || '').trim().slice(0, 30) || null;
    } else if (secao.kind === 'video') {
      const caminho = req.body.videoPath;
      const link = String(req.body.videoUrl || '').trim();

      if (caminho) {
        if (typeof caminho !== 'string' || !caminho.startsWith('/midia/videos/')) {
          return res.status(400).json({ error: 'Vídeo inválido.' });
        }
        novo.kind = 'video';
        novo.videoPath = caminho;
        // capa tirada do próprio vídeo lá no navegador
        if (req.body.thumbDataUrl) novo.videoThumb = salvarImagem(req.body.thumbDataUrl, 'fotos');
      } else if (link) {
        const info = analisarLink(link);
        if (!info || info.provedor !== 'youtube') {
          return res.status(400).json({ error: 'Só reconheço link do YouTube por aqui. Ou envie o arquivo do vídeo.' });
        }
        novo.kind = 'video';
        novo.videoEmbed = info.embedUrl;
        novo.videoThumb = info.thumb;
      } else {
        return res.status(400).json({ error: 'Envie um vídeo ou cole um link do YouTube.' });
      }
    } else if (!corpo) {
      return res.status(400).json({ error: 'Escreve alguma coisa no corpo do tópico.' });
    }
  } catch (err) {
    if (err instanceof ErroDeMidia) return res.status(400).json({ error: err.userMessage });
    throw err;
  }

  const id = topics.criar(novo);
  const criado = topics.porId(id);

  realtime.avisarPorUsuario((destinatarioId) => ({
    tipo: 'topico_novo',
    topico: enriquecer([criado], destinatarioId)[0],
  }));

  res.status(201).json({ topico: enriquecer([criado], req.user.id)[0] });
});

// ---------- responder ----------
router.post('/topicos/:id/respostas', exigirLogin, (req, res) => {
  const topicId = Number(req.params.id);
  if (!topics.porId(topicId)) return res.status(404).json({ error: 'Tópico não encontrado.' });

  const corpo = String(req.body.body || '').trim().slice(0, MAX_RESPOSTA);
  if (!corpo) return res.status(400).json({ error: 'Escreve alguma coisa antes de enviar.' });

  const id = replies.criar({ topicId, userId: req.user.id, body: corpo });
  const resposta = replies.porId(id);
  const topico = topics.porId(topicId);

  realtime.avisarPorUsuario((destinatarioId) => ({
    tipo: 'resposta_nova',
    topicId,
    resposta: { ...resposta, isMine: resposta.userId === destinatarioId, liked: false },
    replyCount: topico.replyCount,
  }));

  res.status(201).json({ resposta: { ...resposta, isMine: true, liked: false } });
});

// ---------- curtir ----------
router.post('/topicos/:id/curtir', exigirLogin, (req, res) => {
  const id = Number(req.params.id);
  if (!topics.porId(id)) return res.status(404).json({ error: 'Tópico não encontrado.' });
  const r = likes.alternar(req.user.id, 'topic', id);
  realtime.avisar({ tipo: 'curtida', alvo: 'topic', id, total: r.total });
  res.json(r);
});

router.post('/respostas/:id/curtir', exigirLogin, (req, res) => {
  const id = Number(req.params.id);
  if (!replies.porId(id)) return res.status(404).json({ error: 'Resposta não encontrada.' });
  const r = likes.alternar(req.user.id, 'reply', id);
  realtime.avisar({ tipo: 'curtida', alvo: 'reply', id, total: r.total });
  res.json(r);
});

// ---------- avaliar uma captura ----------
router.post('/topicos/:id/avaliar', exigirLogin, (req, res) => {
  const id = Number(req.params.id);
  const topico = topics.porId(id);
  if (!topico) return res.status(404).json({ error: 'Tópico não encontrado.' });
  if (topico.kind !== 'captura') return res.status(400).json({ error: 'Só dá pra avaliar captura.' });
  if (topico.userId === req.user.id) {
    return res.status(400).json({ error: 'Não dá pra avaliar a sua própria captura.' });
  }

  const notas = [req.body.enrolacao, req.body.tiragem, req.body.visual].map(Number);
  if (notas.some((n) => !Number.isInteger(n) || n < 1 || n > 5)) {
    return res.status(400).json({ error: 'As notas precisam ser de 1 a 5.' });
  }

  ratings.salvar({ topicId: id, userId: req.user.id, enrolacao: notas[0], tiragem: notas[1], visual: notas[2] });
  const atualizado = topics.porId(id);

  realtime.avisarPorUsuario((destinatarioId) => ({
    tipo: 'nota_nova',
    topico: enriquecer([atualizado], destinatarioId)[0],
  }));

  res.json({ topico: enriquecer([atualizado], req.user.id)[0] });
});

// ---------- marcar a melhor resposta (dono do tópico) ----------
router.post('/topicos/:id/resolver', exigirLogin, (req, res) => {
  const id = Number(req.params.id);
  const topico = topics.porId(id);
  if (!topico) return res.status(404).json({ error: 'Tópico não encontrado.' });
  if (topico.userId !== req.user.id && !ehDono(req.user)) {
    return res.status(403).json({ error: 'Só quem abriu o tópico marca a melhor resposta.' });
  }

  const replyId = req.body.replyId ? Number(req.body.replyId) : null;
  if (replyId) {
    const r = replies.porId(replyId);
    if (!r || r.topicId !== id) return res.status(400).json({ error: 'Essa resposta não é desse tópico.' });
  }

  replies.marcarResposta(id, replyId);
  realtime.avisar({ tipo: 'topico_resolvido', topicId: id, replyId });
  res.json({ ok: true, solved: !!replyId, replyId });
});

// ---------- fixar (só o dono do fórum) ----------
router.post('/topicos/:id/fixar', exigirLogin, (req, res) => {
  if (!ehDono(req.user)) return res.status(403).json({ error: 'Só o dono do fórum fixa tópico.' });
  const id = Number(req.params.id);
  if (!topics.porId(id)) return res.status(404).json({ error: 'Tópico não encontrado.' });
  const valor = !!req.body.pinned;
  topics.definirFixado(id, valor);
  realtime.avisar({ tipo: 'topico_fixado', topicId: id, pinned: valor });
  res.json({ ok: true, pinned: valor });
});

// ---------- apagar ----------
router.delete('/topicos/:id', exigirLogin, (req, res) => {
  const id = Number(req.params.id);
  const dono = topics.donoDe(id);
  if (dono === null) return res.status(404).json({ error: 'Tópico não encontrado.' });
  if (dono !== req.user.id && !ehDono(req.user)) {
    return res.status(403).json({ error: 'Você só pode apagar o que é seu.' });
  }
  topics.apagar(id);
  realtime.avisar({ tipo: 'topico_apagado', topicId: id });
  res.json({ ok: true });
});

router.delete('/respostas/:id', exigirLogin, (req, res) => {
  const id = Number(req.params.id);
  const resposta = replies.porId(id);
  if (!resposta) return res.status(404).json({ error: 'Resposta não encontrada.' });
  if (resposta.userId !== req.user.id && !ehDono(req.user)) {
    return res.status(403).json({ error: 'Você só pode apagar o que é seu.' });
  }
  replies.apagar(id);
  realtime.avisar({ tipo: 'resposta_apagada', replyId: id, topicId: resposta.topicId });
  res.json({ ok: true });
});

// ---------- busca geral ----------
router.get('/busca', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ topicos: [], pessoas: [] });
  const lista = topics.listar({ busca: q, limite: 30 });
  res.json({
    topicos: enriquecer(lista, req.user ? req.user.id : null),
    pessoas: users.buscar(q, 10),
  });
});

// ---------- números do fórum (mostrados na home) ----------
router.get('/resumo', (req, res) => {
  res.json({ numeros: topics.contarAtividade() });
});

module.exports = router;
module.exports.enriquecer = enriquecer;
module.exports.CATEGORIAS = CATEGORIAS;
