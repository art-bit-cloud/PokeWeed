const express = require('express');
const users = require('../db/users');
const { parseCharacter } = require('../db/personagem');
const { hashPassword, verifyPassword, generateToken } = require('../lib/auth');
const sessao = require('../lib/sessao');

const router = express.Router();

// Sem regra de caracteres nem mínimo: qualquer nome serve, contanto que não
// seja só espaço. Só um teto folgado pra não quebrar o layout.
const MAX_USERNAME = 40;
const MIN_SENHA = 4;

function publico(u) {
  return {
    id: u.id,
    username: u.username,
    avatarPath: u.avatar_path || null,
    bannerPath: u.banner_path || null,
    bio: u.bio || null,
    status: u.status || null,
    accent: u.accent || null,
    musicUrl: u.music_url || null,
    musicProvider: u.music_provider || null,
    musicEmbed: u.music_embed || null,
    musicTitle: u.music_title || null,
    character: parseCharacter(u.character),
  };
}

router.post('/registrar', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username) return res.status(400).json({ error: 'Digite um nome de usuário.' });
  if (username.length > MAX_USERNAME) {
    return res.status(400).json({ error: `Nome muito longo (máx. ${MAX_USERNAME} caracteres).` });
  }
  if (password.length < MIN_SENHA) {
    return res.status(400).json({ error: `A senha precisa de pelo menos ${MIN_SENHA} caracteres.` });
  }
  if (users.porUsername(username)) {
    return res.status(409).json({ error: 'Esse nome já está em uso.' });
  }

  const { hash, salt } = hashPassword(password);
  const id = users.criar({ username, passwordHash: hash, salt });

  const token = generateToken();
  users.criarSessao(token, id, sessao.TTL_MS);
  sessao.definirCookie(res, token, req.secure);

  res.status(201).json(publico(users.porId(id)));
});

router.post('/entrar', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const u = users.porUsername(username);
  if (!u || !verifyPassword(password, u.salt, u.password_hash)) {
    return res.status(401).json({ error: 'Usuário ou senha errados.' });
  }

  const token = generateToken();
  users.criarSessao(token, u.id, sessao.TTL_MS);
  sessao.definirCookie(res, token, req.secure);
  users.marcarVisto(u.id);

  res.json(publico(u));
});

router.post('/sair', (req, res) => {
  const token = (req.headers.cookie || '')
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${sessao.COOKIE}=`));
  if (token) users.apagarSessao(token.split('=')[1]);
  sessao.limparCookie(res);
  res.json({ ok: true });
});

router.get('/eu', sessao.exigirLogin, (req, res) => {
  users.marcarVisto(req.user.id);
  res.json(publico(req.user));
});

module.exports = router;
module.exports.publico = publico;
