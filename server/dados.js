// Onde o PokeWeed guarda o que importa: o banco (contas, tópicos, respostas,
// capturas, notas) e os arquivos (fotos, banners, vídeos).
//
// REGRA PRINCIPAL: isso NÃO fica dentro da pasta do app.
//
// Atualizar o PokeWeed é baixar uma versão nova e trocar a pasta. Se os dados
// morassem aqui dentro, iriam junto — sem aviso. Então eles moram do lado de
// fora, numa pasta que nada do app apaga.
//
//   Windows:  C:\Users\<você>\AppData\Local\PokeWeed
//   macOS:    ~/Library/Application Support/PokeWeed
//   Linux:    ~/.pokeweed
//
// Numa hospedagem, aponte DATA_DIR pro disco persistente (ex: /dados).
// POKEWEED_DATA continua funcionando também — é o nome antigo dessa mesma
// variável, mantido pra não quebrar quem já hospedou usando ele (ex: Render).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function pastaPadrao() {
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(base, 'PokeWeed');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'PokeWeed');
  }
  return path.join(os.homedir(), '.pokeweed');
}

const DATA_DIR = process.env.DATA_DIR || process.env.POKEWEED_DATA || pastaPadrao();
const DB_PATH = process.env.DB_FILE || path.join(DATA_DIR, 'pokeweed.db');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(DATA_DIR, 'midia');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Subpastas por tipo, pra não virar um monte de arquivo solto.
const DIRS = {
  fotos: path.join(MEDIA_DIR, 'fotos'),
  avatares: path.join(MEDIA_DIR, 'avatares'),
  banners: path.join(MEDIA_DIR, 'banners'),
  videos: path.join(MEDIA_DIR, 'videos'),
};

// Onde a versão 1 guardava tudo (dentro da pasta do app).
const ANTIGO_DB = path.join(__dirname, 'pokeweed.db');
const ANTIGO_UPLOADS = path.join(__dirname, 'uploads');

for (const dir of [DATA_DIR, MEDIA_DIR, BACKUPS_DIR, path.dirname(DB_PATH), ...Object.values(DIRS)]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Se ainda não existe banco no lugar novo mas existe um do jeito antigo, traz
// ele junto com as fotos. Copia, não move: o arquivo antigo fica de reserva.
function migrarDoLocalAntigo() {
  if (fs.existsSync(DB_PATH)) return null;
  if (!fs.existsSync(ANTIGO_DB)) return null;

  fs.copyFileSync(ANTIGO_DB, DB_PATH);

  let fotos = 0;
  if (fs.existsSync(ANTIGO_UPLOADS)) {
    for (const nome of fs.readdirSync(ANTIGO_UPLOADS)) {
      if (nome === '.gitkeep') continue;
      const de = path.join(ANTIGO_UPLOADS, nome);
      const para = path.join(DIRS.fotos, nome);
      if (fs.statSync(de).isFile() && !fs.existsSync(para)) {
        fs.copyFileSync(de, para);
        fotos++;
      }
    }
  }
  return { fotos };
}

// Cópia de segurança do banco, guardando as 20 mais recentes.
function fazerBackup() {
  if (!fs.existsSync(DB_PATH)) return null;

  const a = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const carimbo = `${a.getFullYear()}${p2(a.getMonth() + 1)}${p2(a.getDate())}-${p2(a.getHours())}${p2(a.getMinutes())}`;
  const destino = path.join(BACKUPS_DIR, `pokeweed-${carimbo}.db`);

  try {
    if (!fs.existsSync(destino)) fs.copyFileSync(DB_PATH, destino);
    const antigos = fs.readdirSync(BACKUPS_DIR).filter((n) => n.endsWith('.db')).sort();
    while (antigos.length > 20) fs.unlinkSync(path.join(BACKUPS_DIR, antigos.shift()));
    return destino;
  } catch (err) {
    console.warn('[PokeWeed] não consegui salvar o backup:', err.message);
    return null;
  }
}

const migracao = migrarDoLocalAntigo();
fazerBackup();

module.exports = { DATA_DIR, DB_PATH, MEDIA_DIR, BACKUPS_DIR, DIRS, ANTIGO_DB, migracao, fazerBackup };
