// Restaura um banco do PokeWeed a partir de um pokeweed.db que você tenha
// guardado (pasta antiga, lixeira, backup automático).
//
//   node restaurar.js <caminho-do-pokeweed.db> [pasta-de-midia-ou-uploads]
//
// Antes de trocar qualquer coisa ele guarda o banco atual nos backups.
// Rode com o servidor DESLIGADO.

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const dados = require('./dados');

function sair(msg) {
  console.error('\n' + msg + '\n');
  process.exit(1);
}

const origemDb = process.argv[2];
const origemMidia = process.argv[3];

if (!origemDb) {
  sair(
    'Faltou dizer qual arquivo restaurar.\n\n' +
      '  node restaurar.js <caminho-do-pokeweed.db> [pasta-de-midia]\n\n' +
      `Backups automáticos ficam em:\n  ${dados.BACKUPS_DIR}`
  );
}
if (!fs.existsSync(origemDb) || !fs.statSync(origemDb).isFile()) {
  sair(`Não achei esse arquivo:\n  ${origemDb}`);
}

// confere que é mesmo um SQLite antes de sobrescrever qualquer coisa
const cabecalho = Buffer.alloc(16);
const fd = fs.openSync(origemDb, 'r');
fs.readSync(fd, cabecalho, 0, 16, 0);
fs.closeSync(fd);
if (!cabecalho.toString('utf8', 0, 15).startsWith('SQLite format 3')) {
  sair(`Esse arquivo não parece um banco do PokeWeed (não é um SQLite):\n  ${origemDb}`);
}

try {
  const espia = new DatabaseSync(origemDb, { readOnly: true });
  const n = (t) => {
    try {
      return espia.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    } catch {
      return 0;
    }
  };
  const nomes = (() => {
    try {
      return espia.prepare('SELECT username FROM users ORDER BY id').all().map((r) => '@' + r.username);
    } catch {
      return [];
    }
  })();
  console.log(
    `\nO arquivo tem: ${n('users')} conta(s), ${n('topics') || n('catches')} tópico(s)/captura(s), ${n('ratings')} avaliação(ões)`
  );
  if (nomes.length) console.log(`Contas: ${nomes.join(', ')}`);
  espia.close();
} catch (err) {
  sair(`Consegui abrir o arquivo, mas ele não tem cara de banco do PokeWeed: ${err.message}`);
}

const salvo = dados.fazerBackup();
if (salvo) console.log(`\nGuardei o banco atual antes de trocar:\n  ${salvo}`);

fs.copyFileSync(origemDb, dados.DB_PATH);
console.log(`\nBanco restaurado em:\n  ${dados.DB_PATH}`);

if (origemMidia) {
  if (!fs.existsSync(origemMidia) || !fs.statSync(origemMidia).isDirectory()) {
    console.warn(`\nAviso: não achei a pasta "${origemMidia}". O banco foi restaurado, mas as imagens podem aparecer quebradas.`);
  } else {
    let copiadas = 0;
    const copiarPasta = (de, para) => {
      for (const nome of fs.readdirSync(de)) {
        const origem = path.join(de, nome);
        if (fs.statSync(origem).isDirectory()) continue;
        if (nome === '.gitkeep') continue;
        const destino = path.join(para, nome);
        if (!fs.existsSync(destino)) {
          fs.copyFileSync(origem, destino);
          copiadas++;
        }
      }
    };
    // aceita tanto a pasta "midia" nova (com subpastas) quanto a "uploads" antiga (tudo solto)
    const subpastas = fs.readdirSync(origemMidia).filter((n) => fs.statSync(path.join(origemMidia, n)).isDirectory());
    if (subpastas.length) {
      for (const sub of subpastas) {
        const destino = dados.DIRS[sub];
        if (destino) copiarPasta(path.join(origemMidia, sub), destino);
      }
    } else {
      copiarPasta(origemMidia, dados.DIRS.fotos);
    }
    console.log(`Arquivos copiados: ${copiadas}`);
  }
} else {
  console.log('\nObs: sem a pasta de mídia, as imagens podem aparecer quebradas. Rode de novo passando ela como segundo argumento.');
}

console.log('\nPronto. Pode ligar o PokeWeed de novo.\n');
