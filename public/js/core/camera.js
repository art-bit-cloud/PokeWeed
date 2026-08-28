// Câmera + a animação de captura (a parte "Pokémon Go" do PokeWeed).
// Sem lib nenhuma: getUserMedia pra câmera, canvas pra tirar a foto.

let stream = null;
let cameraTraseira = true;

export async function ligar(videoEl) {
  desligar();
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: cameraTraseira ? { ideal: 'environment' } : 'user' },
    audio: false,
  });
  videoEl.srcObject = stream;
  // sem await: se o elemento ainda não estiver na página, o play() pode nunca
  // resolver e travaria a tela inteira
  videoEl.play().catch(() => {});
}

export async function virar(videoEl) {
  cameraTraseira = !cameraTraseira;
  await ligar(videoEl);
}

export function desligar() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

export function ligada() {
  return !!stream;
}

// Tira um frame do vídeo já reduzido, e devolve um dataURL jpeg.
export function tirarFoto(videoEl, larguraMax = 1000) {
  const vw = videoEl.videoWidth || 720;
  const vh = videoEl.videoHeight || 960;
  const escala = Math.min(1, larguraMax / vw);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vw * escala);
  canvas.height = Math.round(vh * escala);
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

const FOLHAS = ['🍁', '🍁', '🌿', '🌱', '✨'];

function soltarFolhas(camada, quantidade = 16) {
  const criadas = [];
  for (let i = 0; i < quantidade; i++) {
    const f = document.createElement('span');
    f.className = 'folha';
    f.textContent = FOLHAS[Math.floor(Math.random() * FOLHAS.length)];

    const angulo = Math.random() * Math.PI * 2;
    const distancia = 70 + Math.random() * 120;
    f.style.setProperty('--dx', `${Math.cos(angulo) * distancia}px`);
    f.style.setProperty('--dy', `${Math.sin(angulo) * distancia - 26}px`);
    f.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 280}deg`);
    f.style.animationDelay = `${Math.random() * 170}ms`;
    f.style.fontSize = `${15 + Math.random() * 15}px`;

    camada.appendChild(f);
    criadas.push(f);
  }
  setTimeout(() => criadas.forEach((f) => f.remove()), 1300);
}

// Toca a animação inteira sobre o elemento e resolve quando termina.
export function animarCaptura(palco) {
  return new Promise((resolve) => {
    const fx = document.createElement('div');
    fx.className = 'fx-captura';
    fx.innerHTML = `
      <div class="fx-bola"></div>
      <div class="folhas"></div>
      <div class="fx-texto">Capturado!</div>
    `;
    palco.appendChild(fx);

    const camada = fx.querySelector('.folhas');
    soltarFolhas(camada);
    setTimeout(() => soltarFolhas(camada, 10), 380);

    setTimeout(() => {
      fx.remove();
      resolve();
    }, 1500);
  });
}
