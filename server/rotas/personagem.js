const express = require('express');
const personagem = require('../db/personagem');
const { exigirLogin } = require('../lib/sessao');

const router = express.Router();

// Catálogo completo (categorias + itens) — o cliente busca isso uma vez e
// guarda, pra montar qualquer personagem sem precisar de mais nenhuma
// chamada por avatar.
router.get('/personagem/catalogo', (req, res) => {
  res.json({ categorias: personagem.catalogo() });
});

// Salva o que o usuário equipou. Só os slugs — nada de imagem renderizada.
router.put('/personagem', exigirLogin, (req, res) => {
  const config = personagem.salvarConfig(req.user.id, req.body.character);
  res.json({ character: Object.keys(config).length ? config : null });
});

module.exports = router;
