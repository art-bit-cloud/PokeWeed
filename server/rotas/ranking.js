const express = require('express');
const ratings = require('../db/ratings');

const router = express.Router();

router.get('/ranking', (req, res) => {
  res.json({
    capturadores: ratings.topCapturadores(10),
    avaliados: ratings.topAvaliados(10, 1),
    curtidos: ratings.topCurtidos(10),
  });
});

module.exports = router;
