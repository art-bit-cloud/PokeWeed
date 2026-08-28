// WebSocket pra atualizar as telas ao vivo (tópico novo, resposta, curtida,
// avaliação) sem ninguém precisar dar refresh.
//
// Cada conexão sabe de quem é, porque parte do que a gente manda depende de
// quem recebe (ex: "essa captura é minha", "eu já curti isso").

const { WebSocketServer } = require('ws');
const { usuarioDaRequisicao } = require('./sessao');

const wss = new WebSocketServer({ noServer: true });
const clientes = new Set();

function conectar(servidorHttp) {
  servidorHttp.on('upgrade', (req, socket, head) => {
    const usuario = usuarioDaRequisicao(req);
    if (!usuario) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.pwUserId = usuario.id;
      clientes.add(ws);
      ws.on('close', () => clientes.delete(ws));
      ws.on('error', () => clientes.delete(ws));
    });
  });
}

// Mesma mensagem pra todo mundo (nada que dependa de quem recebe).
function avisar(payload) {
  const cru = JSON.stringify(payload);
  for (const ws of clientes) {
    if (ws.readyState === ws.OPEN) ws.send(cru);
  }
}

// Mensagem montada pra cada destinatário — usada quando o conteúdo muda de
// acordo com quem está olhando.
function avisarPorUsuario(monta) {
  for (const ws of clientes) {
    if (ws.readyState !== ws.OPEN) continue;
    const payload = monta(ws.pwUserId);
    if (payload) ws.send(JSON.stringify(payload));
  }
}

module.exports = { conectar, avisar, avisarPorUsuario };
