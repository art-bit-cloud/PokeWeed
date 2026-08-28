// Sessão por cookie httpOnly guardado no banco. Sem JWT, sem lib externa.

const users = require('../db/users');

const COOKIE = 'pw_sessao';
const TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 dias

function lerCookies(req) {
  const cru = req.headers.cookie;
  if (!cru) return {};
  return Object.fromEntries(
    cru.split(';').map((parte) => {
      const i = parte.indexOf('=');
      return [decodeURIComponent(parte.slice(0, i).trim()), decodeURIComponent(parte.slice(i + 1))];
    })
  );
}

function definirCookie(res, token, seguro) {
  const partes = [
    `${COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(TTL_MS / 1000)}`,
  ];
  if (seguro) partes.push('Secure');
  res.setHeader('Set-Cookie', partes.join('; '));
}

function limparCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

// Descobre o usuário a partir do cookie. Serve tanto pro Express quanto pro
// handshake do WebSocket (que recebe o req cru).
function usuarioDaRequisicao(req) {
  const token = lerCookies(req)[COOKIE];
  if (!token) return null;
  const sessao = users.pegarSessao(token);
  if (!sessao) return null;
  return users.porId(sessao.user_id) || null;
}

function anexarUsuario(req, _res, next) {
  req.user = usuarioDaRequisicao(req);
  next();
}

function exigirLogin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Você precisa estar logado.' });
  next();
}

module.exports = { COOKIE, TTL_MS, definirCookie, limparCookie, usuarioDaRequisicao, anexarUsuario, exigirLogin };
