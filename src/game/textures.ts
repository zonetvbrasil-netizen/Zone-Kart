import * as THREE from 'three';

/**
 * Gera textura procedural de asfalto com granulação e marcações neon laterais.
 */
export function createAsphaltTextures(maxAnisotropy: number, accentHex = '#C6FF00') {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  ctx.fillStyle = '#16181F';
  ctx.fillRect(0, 0, size, size);

  // Granulação sutil do asfalto
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 18 + Math.floor(Math.random() * 22);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Faixas laterais neon verde-limão
  ctx.fillStyle = accentHex;
  ctx.fillRect(10, 0, 12, size);
  ctx.fillRect(size - 22, 0, 12, size);

  // Linha tracejada central discreta
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let y = 16; y < size; y += 64) {
    ctx.fillRect(size * 0.5 - 3, y, 6, 34);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  // Bump map em escala de cinza
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const v = 90 + Math.floor(Math.random() * 80);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Gera textura de terreno para o entorno da pista (cidade/arena/deserto).
 */
export function createGroundGridTexture(
  baseColor: string,
  gridColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(60, 60);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Textura de faixa de turbo (setas neon brilhantes).
 */
export function createBoostPadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0B1206';
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = '#C6FF00';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 496);

  for (let y = 70; y <= 430; y += 115) {
    ctx.fillStyle = '#C6FF00';
    ctx.beginPath();
    ctx.moveTo(128, y - 42);
    ctx.lineTo(212, y + 36);
    ctx.lineTo(175, y + 36);
    ctx.lineTo(128, y - 8);
    ctx.lineTo(81, y + 36);
    ctx.lineTo(44, y + 36);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Textura de linha de chegada quadriculada + faixa "ZONE PLAY".
 */
export function createFinishLineTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const sq = 32;
  for (let y = 0; y < 128; y += sq) {
    for (let x = 0; x < 512; x += sq) {
      const even = ((x / sq) + (y / sq)) % 2 === 0;
      ctx.fillStyle = even ? '#FFFFFF' : '#0A0A0A';
      ctx.fillRect(x, y, sq, sq);
    }
  }
  ctx.fillStyle = '#C6FF00';
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillRect(0, 118, 512, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Banner luminoso ZONE PLAY para pórticos e telões da Arena Gamer.
 */
export function createZoneBannerTexture(
  subtitle: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#C6FF00';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 1004, 236);

  ctx.fillStyle = '#C6FF00';
  ctx.font = 'italic bold 108px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ZONE PLAY', 512, 108);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(subtitle, 512, 194);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Textura de sombra de contato radial suave sob os karts e caixas.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Textura com símbolo "?" para caixas de item.
 */
export function createQuestionMarkTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0D1408';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#C6FF00';
  ctx.lineWidth = 18;
  ctx.strokeRect(12, 12, size - 24, size - 24);

  ctx.fillStyle = '#C6FF00';
  ctx.font = 'bold 165px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', size / 2, size / 2 + 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Textura de fachada noturna cyberpunk com janelas iluminadas verde-limão e ciano.
 */
export function createBuildingFacadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090B10';
  ctx.fillRect(0, 0, 256, 512);

  const cols = 8;
  const rows = 20;
  const cellW = 256 / cols;
  const cellH = 512 / rows;

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const hash = ((r * 37 + c * 17) % 100) / 100;
      if (hash < 0.28) {
        ctx.fillStyle = hash < 0.14 ? '#C6FF00' : hash < 0.22 ? '#00F0FF' : '#2D3748';
        ctx.fillRect(c * cellW + 4, r * cellH + 5, cellW - 8, cellH - 10);
      } else {
        ctx.fillStyle = '#10141E';
        ctx.fillRect(c * cellW + 4, r * cellH + 5, cellW - 8, cellH - 10);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Cria textura de fallback estilizada caso uma imagem de mascote não carregue.
 */
function createMascotFallbackTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#101014';
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#C6FF00';
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.fillStyle = '#C6FF00';
  ctx.font = 'bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label[0] ?? 'Z', 128, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Carrega a imagem do mascote (Zone ou Zonia) e remove o fundo sólido (branco ou preto)
 * usando preenchimento BFS a partir das bordas, gerando um sprite transparente nítido.
 */
export function loadMascotCutoutTexture(
  imageUrl: string,
  mode: 'white' | 'black',
  label: string
): Promise<THREE.CanvasTexture> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = 320;
        const h = Math.round((img.height / img.width) * w) || 380;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isBgPixel = (idx: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          if (mode === 'white') {
            return r >= 232 && g >= 232 && b >= 232;
          }
          // Fundo preto puro da Zonia: limiar rígido para preservar o moletom escuro
          return r <= 12 && g <= 12 && b <= 12;
        };

        const pushIfBg = (x: number, y: number) => {
          const idx = y * w + x;
          if (!visited[idx] && isBgPixel(idx)) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        };

        for (let x = 0; x < w; x++) {
          pushIfBg(x, 0);
          pushIfBg(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          pushIfBg(0, y);
          pushIfBg(w - 1, y);
        }

        while (head < tail) {
          const idx = queue[head++];
          data[idx * 4 + 3] = 0;
          const x = idx % w;
          const y = (idx - x) / w;
          if (x > 0) pushIfBg(x - 1, y);
          if (x < w - 1) pushIfBg(x + 1, y);
          if (y > 0) pushIfBg(x, y - 1);
          if (y < h - 1) pushIfBg(x, y + 1);
        }

        // Suavização de 1px na borda do recorte
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (!visited[idx]) {
              const adjTransparent =
                visited[idx - 1] || visited[idx + 1] || visited[idx - w] || visited[idx + w];
              if (adjTransparent) {
                data[idx * 4 + 3] = 190;
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        resolve(tex);
      } catch {
        resolve(createMascotFallbackTexture(label));
      }
    };
    img.onerror = () => {
      resolve(createMascotFallbackTexture(label));
    };
    img.src = imageUrl;
  });
}
