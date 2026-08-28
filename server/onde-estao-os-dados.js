// Mostra onde ficam as contas, os tópicos, as fotos, os vídeos e os backups.
// Uso: npm run dados

const fs = require('node:fs');
const path = require('node:path');
const dados = require('./dados');

console.log('\n=== PokeWeed: onde estão seus dados ===\n');
console.log(`Pasta principal : ${dados.DATA_DIR}`);
console.log(`Banco           : ${dados.DB_PATH}`);
console.log(`Mídia           : ${dados.MEDIA_DIR}`);
console.log(`Backups         : ${dados.BACKUPS_DIR}`);

if (!fs.existsSync(dados.DB_PATH)) {
  console.log('\nAinda não existe banco — nenhuma conta foi criada por aqui.\n');
  process.exit(0);
}

const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(dados.DB_PATH, { readOnly: true });
const n = (t) => {
  try {
    return db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  } catch {
    return '?';
  }
};

console.log(
  `\nGuardado hoje: ${n('users')} conta(s), ${n('topics')} tópico(s), ${n('replies')} resposta(s), ${n('ratings')} avaliação(ões)`
);
try {
  const contas = db.prepare('SELECT username FROM users ORDER BY id').all().map((r) => '@' + r.username);
  if (contas.length) console.log(`Contas: ${contas.join(', ')}`);
} catch {}
db.close();

for (const [nome, dir] of Object.entries(dados.DIRS)) {
  const qtd = fs.existsSync(dir) ? fs.readdirSync(dir).length : 0;
  console.log(`Arquivos em ${nome}: ${qtd}`);
}

if (fs.existsSync(dados.BACKUPS_DIR)) {
  const backups = fs.readdirSync(dados.BACKUPS_DIR).filter((f) => f.endsWith('.db')).sort().reverse();
  if (backups.length) {
    console.log(`\nBackups automáticos (${backups.length}), do mais novo pro mais velho:`);
    backups.slice(0, 5).forEach((b) => {
      const kb = Math.round(fs.statSync(path.join(dados.BACKUPS_DIR, b)).size / 1024);
      console.log(`  ${b}  (${kb} KB)`);
    });
    if (backups.length > 5) console.log(`  ...e mais ${backups.length - 5}`);
    console.log('\nPra voltar pra um deles:');
    console.log(`  npm run restaurar -- "${path.join(dados.BACKUPS_DIR, backups[0])}"`);
  }
}

console.log('\nEssa pasta fica fora do PokeWeed de propósito: pode trocar a pasta do app que os dados continuam aí.\n');
