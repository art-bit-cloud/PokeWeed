const express = require('express');
const { exigirLogin } = require('../lib/sessao');
const { salvarVideoDoStream, ErroDeMidia, LIMITES } = require('../lib/midia');

const router = express.Router();

// Envio de vídeo. O arquivo vem cru no corpo (o navegador manda o File direto)
// e é gravado em disco em pedaços — nada de segurar 40MB na memória.
//
// Esta rota é montada ANTES do express.json justamente pra que o corpo chegue
// intacto aqui.
router.post('/video', exigirLogin, async (req, res) => {
  try {
    const { caminho, bytes } = await salvarVideoDoStream(req);
    res.status(201).json({ videoPath: caminho, bytes });
  } catch (err) {
    if (err instanceof ErroDeMidia) return res.status(400).json({ error: err.userMessage });
    console.error('[upload de vídeo]', err);
    res.status(500).json({ error: 'Não consegui salvar o vídeo.' });
  }
});

router.get('/limites', (req, res) => {
  res.json({
    imagemMB: Math.round(LIMITES.imagemBytes / 1024 / 1024),
    videoMB: Math.round(LIMITES.videoBytes / 1024 / 1024),
  });
});

module.exports = router;
