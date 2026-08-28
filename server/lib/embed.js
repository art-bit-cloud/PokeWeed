// Transforma um link colado (YouTube, Spotify) em algo que dá pra embutir na
// página. Feito no servidor pra guardar já normalizado no banco — o front só
// monta o iframe com o que vier daqui.

function extrairYoutube(url) {
  const padroes = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of padroes) {
    const m = p.exec(url);
    if (m) return m[1];
  }
  return null;
}

function extrairSpotify(url) {
  const m = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)/.exec(url);
  return m ? { tipo: m[1], id: m[2] } : null;
}

// Devolve { provedor, id, embedUrl, thumb } ou null se não reconhecer.
function analisarLink(url) {
  if (typeof url !== 'string') return null;
  const limpo = url.trim();
  if (!limpo) return null;
  if (!/^https?:\/\//i.test(limpo)) return null;

  const yt = extrairYoutube(limpo);
  if (yt) {
    return {
      provedor: 'youtube',
      id: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
      thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  const sp = extrairSpotify(limpo);
  if (sp) {
    return {
      provedor: 'spotify',
      id: sp.id,
      embedUrl: `https://open.spotify.com/embed/${sp.tipo}/${sp.id}`,
      thumb: null,
    };
  }

  return null;
}

module.exports = { analisarLink };
