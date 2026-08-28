// Ligação ao vivo com o servidor. Recebe as novidades e repassa como eventos
// internos — cada tela escuta o que interessa pra ela.

import { emitir, store } from './store.js';

let ws = null;
let tentativa = 0;

export function conectar() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocolo}://${location.host}`);

  ws.onopen = () => { tentativa = 0; };

  ws.onmessage = (evento) => {
    let msg;
    try {
      msg = JSON.parse(evento.data);
    } catch {
      return;
    }

    // mantém o cache em dia antes de avisar as telas
    if (msg.topico) store.guardarTopico(msg.topico);
    if (msg.tipo === 'curtida' && msg.alvo === 'topic') {
      const t = store.pegarTopico(msg.id);
      if (t) t.likeCount = msg.total;
    }

    emitir(msg.tipo, msg);
    emitir('*', msg);
  };

  ws.onclose = () => {
    ws = null;
    if (!store.eu) return;
    // volta a tentar com espera crescente, sem fazer alarde
    tentativa = Math.min(tentativa + 1, 6);
    setTimeout(conectar, 1000 * tentativa);
  };

  ws.onerror = () => { try { ws.close(); } catch {} };
}

export function desconectar() {
  if (ws) {
    ws.onclose = null;
    try { ws.close(); } catch {}
    ws = null;
  }
}
