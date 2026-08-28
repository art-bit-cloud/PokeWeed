const express = require('express');

const users = require('../db/users');
const topics = require('../db/topics');
const replies = require('../db/replies');
const { exigirLogin } = require('../lib/sessao');
const { salvarImagem, apagarMidia, ErroDeMidia } = require('../lib/midia');
const { analisarLink } = require('../lib/embed');
const { enriquecer } = require('./forum');

const router = express.Router();

const MAX_BIO = 400;
const MAX_STATUS = 80;
const CORES_OK = /^#[0-9a-fA-F]{6}$/;

// ---------- ver o perfil de alguém ----------
router.get('/perfil/:username', (req, res) => {
  const perfil = users.perfil(req.params.username);
  if (!perfil) return res.status(404).json({ error: 'Esse perfil não existe.' });

  const meuId = req.user ? req.user.id : null;
  const dono = users.porUsername(req.params.username);

  res.json({
    perfil,
    ehMeu: !!meuId && meuId === perfil.id,
    capturas: enriquecer(topics.listar({ userId: dono.id, kind: 'captura', ordem: 'novos', limite: 30 }), meuId),
    topicos: enriquecer(topics.listar({ userId: dono.id, ordem: 'novos', limite: 30 }), meuId),
    respostas: replies.doUsuario(dono.id, 30),
  });
});

// ---------- lista de membros ----------
router.get('/membros', (req, res) => {
  res.json({ membros: users.listar(200) });
});

// ---------- editar o próprio perfil ----------
router.put('/perfil', exigirLogin, (req, res) => {
  const campos = {};

  if ('bio' in req.body) {
    campos.bio = String(req.body.bio || '').trim().slice(0, MAX_BIO) || null;
  }
  if ('status' in req.body) {
    campos.status = String(req.body.status || '').trim().slice(0, MAX_STATUS) || null;
  }
  if ('accent' in req.body) {
    const cor = String(req.body.accent || '').trim();
    if (cor && !CORES_OK.test(cor)) return res.status(400).json({ error: 'Cor inválida.' });
    campos.accent = cor || null;
  }

  // Música: só link (YouTube ou Spotify). O player embutido é montado a partir daqui.
  if ('musicUrl' in req.body) {
    const link = String(req.body.musicUrl || '').trim();
    if (!link) {
      campos.music_url = null;
      campos.music_provider = null;
      campos.music_embed = null;
      campos.music_title = null;
    } else {
      const info = analisarLink(link);
      if (!info) {
        return res.status(400).json({ error: 'Não reconheci esse link. Use um link do YouTube ou do Spotify.' });
      }
      campos.music_url = link;
      campos.music_provider = info.provedor;
      campos.music_embed = info.embedUrl;
      campos.music_title = String(req.body.musicTitle || '').trim().slice(0, 120) || null;
    }
  }

  try {
    if (req.body.avatarDataUrl) {
      const anterior = req.user.avatar_path;
      campos.avatar_path = salvarImagem(req.body.avatarDataUrl, 'avatares');
      if (anterior) apagarMidia(anterior);
    }
    if (req.body.bannerDataUrl) {
      const anterior = req.user.banner_path;
      campos.banner_path = salvarImagem(req.body.bannerDataUrl, 'banners');
      if (anterior) apagarMidia(anterior);
    }
    if (req.body.removerBanner) {
      if (req.user.banner_path) apagarMidia(req.user.banner_path);
      campos.banner_path = null;
    }
  } catch (err) {
    if (err instanceof ErroDeMidia) return res.status(400).json({ error: err.userMessage });
    throw err;
  }

  users.atualizarPerfil(req.user.id, campos);
  const atualizado = users.porId(req.user.id);

  res.json({
    perfil: {
      id: atualizado.id,
      username: atualizado.username,
      avatarPath: atualizado.avatar_path || null,
      bannerPath: atualizado.banner_path || null,
      bio: atualizado.bio || null,
      status: atualizado.status || null,
      accent: atualizado.accent || null,
      musicUrl: atualizado.music_url || null,
      musicProvider: atualizado.music_provider || null,
      musicEmbed: atualizado.music_embed || null,
      musicTitle: atualizado.music_title || null,
    },
  });
});

module.exports = router;
