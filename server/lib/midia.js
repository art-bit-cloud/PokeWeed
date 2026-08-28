// Salvar fotos (base64 vindo do navegador, já redimensionadas lá) e vídeos
// (enviados crus, gravados direto em disco sem passar pela memória).

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dados = require('../dados');

// Limites conservadores: funcionam até em host com pouco disco. Dá pra afrouxar
// por variável de ambiente quando você souber onde vai hospedar.
const LIMITES = {
  imagemBytes: Number(process.env.MAX_IMAGE_MB || 4) * 1024 * 1024,
  videoBytes: Number(process.env.MAX_VIDEO_MB || 40) * 1024 * 1024,
};

const TIPOS_IMAGEM = { jpeg: 'jpeg', jpg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
const TIPOS_VIDEO = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v',
};

class ErroDeMidia extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.userMessage = mensagem;
  }
}

function nomeUnico(ext) {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
}

// dataUrl -> arquivo em disco. Devolve o caminho público (ex: /midia/fotos/x.jpeg)
function salvarImagem(dataUrl, pasta = 'fotos') {
  if (typeof dataUrl !== 'string') throw new ErroDeMidia('Imagem inválida.');

  const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new ErroDeMidia('Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.');

  const ext = TIPOS_IMAGEM[match[1]];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new ErroDeMidia('Imagem vazia.');
  if (buffer.length > LIMITES.imagemBytes) {
    throw new ErroDeMidia(`Imagem grande demais (máx. ${Math.round(LIMITES.imagemBytes / 1024 / 1024)}MB).`);
  }

  const destino = dados.DIRS[pasta];
  if (!destino) throw new ErroDeMidia('Destino de imagem desconhecido.');

  const nome = nomeUnico(ext);
  fs.writeFileSync(path.join(destino, nome), buffer);
  return `/midia/${pasta}/${nome}`;
}

// Recebe o corpo cru da requisição e grava direto em disco, cortando na hora se
// passar do limite (não segura o vídeo inteiro na memória).
function salvarVideoDoStream(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const ext = TIPOS_VIDEO[contentType];
    if (!ext) {
      reject(new ErroDeMidia('Formato de vídeo não suportado. Manda MP4, WEBM ou MOV.'));
      return;
    }

    const declarado = Number(req.headers['content-length'] || 0);
    const limiteMB = Math.round(LIMITES.videoBytes / 1024 / 1024);
    if (declarado && declarado > LIMITES.videoBytes) {
      reject(new ErroDeMidia(`Vídeo grande demais (máx. ${limiteMB}MB). Corta ele ou manda o link do YouTube.`));
      return;
    }

    const nome = nomeUnico(ext);
    const caminho = path.join(dados.DIRS.videos, nome);
    const arquivo = fs.createWriteStream(caminho);

    let recebido = 0;
    let abortado = false;

    const abortar = (err) => {
      if (abortado) return;
      abortado = true;
      arquivo.destroy();
      fs.rm(caminho, { force: true }, () => reject(err));
    };

    req.on('data', (chunk) => {
      recebido += chunk.length;
      if (recebido > LIMITES.videoBytes) {
        abortar(new ErroDeMidia(`Vídeo grande demais (máx. ${limiteMB}MB). Corta ele ou manda o link do YouTube.`));
      }
    });
    req.on('error', () => abortar(new ErroDeMidia('A conexão caiu no meio do envio.')));
    arquivo.on('error', () => abortar(new ErroDeMidia('Não consegui gravar o vídeo no disco.')));
    arquivo.on('finish', () => {
      if (abortado) return;
      if (!recebido) {
        abortar(new ErroDeMidia('Vídeo vazio.'));
        return;
      }
      resolve({ caminho: `/midia/videos/${nome}`, bytes: recebido });
    });

    req.pipe(arquivo);
  });
}

// Apaga um arquivo que a gente mesmo salvou (usado ao trocar avatar/banner).
function apagarMidia(caminhoPublico) {
  if (typeof caminhoPublico !== 'string' || !caminhoPublico.startsWith('/midia/')) return;
  const relativo = caminhoPublico.replace('/midia/', '');
  const alvo = path.resolve(dados.MEDIA_DIR, relativo);
  // trava de segurança: nunca sai da pasta de mídia
  if (!alvo.startsWith(path.resolve(dados.MEDIA_DIR))) return;
  fs.rm(alvo, { force: true }, () => {});
}

module.exports = { salvarImagem, salvarVideoDoStream, apagarMidia, ErroDeMidia, LIMITES };
