// ============================================================================
// CONFIGURAÇÕES PRINCIPAIS DO ZONE PLAY KART 3D
// Edite facilmente as variáveis abaixo para ajustar velocidade, voltas e cores.
// ============================================================================

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';
export type DriverId = 'zone' | 'zonia';
export type TrackId = 'zone_circuit' | 'arena_gamer' | 'lime_desert';
export type SkinId = 'padrao' | 'volt' | 'plasma' | 'hyper';
export type ItemType = 'turbo_z' | 'missil_neon' | 'oleo' | 'escudo_zone';

export const CONFIG_JOGO = {
  /** Quantidade de voltas por corrida */
  numeroVoltas: 3,
  /** Velocidade máxima padrão dos karts (unidades/s) */
  velocidadeMaxima: 68,
  /** Velocidade máxima durante Turbo Z ou Faixa de Turbo */
  velocidadeTurbo: 98,
  /** Aceleração base do kart */
  aceleracao: 46,
  /** Potência de frenagem e marcha à ré */
  frenagem: 62,
  /** Velocidade mínima necessária para iniciar derrapagem (drift) */
  velocidadeDriftMin: 22,
  /** Velocidade de giro padrão (rad/s) */
  taxaGiroBase: 2.25,
  /** Fator de multiplicação para exibir km/h realista no velocímetro */
  fatorKmh: 2.35,
  /** Gravidade usada em saltos de rampas */
  gravidade: 38,
  /** Paleta oficial da marca Zone Play */
  cores: {
    preto: '#0A0A0A',
    verdeNeon: '#C6FF00',
    branco: '#FFFFFF',
    cinzaEscuro: '#16161B',
    cinzaMedio: '#2A2A34',
    ciano: '#00F0FF',
    ambar: '#FFB800',
    vermelho: '#FF3B5C',
  },
};

export interface PersonagemConfig {
  id: DriverId;
  nome: string;
  titulo: string;
  descricao: string;
  imagem: string;
  corPrincipal: string;
  corDestaque: string;
  bonusVelocidade: number;
  bonusTurbo: number;
  bonusControle: number;
}

export const PERSONAGENS: Record<DriverId, PersonagemConfig> = {
  zone: {
    id: 'zone',
    nome: 'ZONE',
    titulo: 'Piloto Principal',
    descricao: 'Óculos escuros com Z verde-limão e jaqueta neon. Equilíbrio perfeito em retas e curvas.',
    imagem: '/assets/aistudio/Mascote_principal_275baec7.png',
    corPrincipal: '#0A0A0A',
    corDestaque: '#C6FF00',
    bonusVelocidade: 1.02,
    bonusTurbo: 1.0,
    bonusControle: 1.0,
  },
  zonia: {
    id: 'zonia',
    nome: 'ZONIA',
    titulo: 'Rainha do Drift',
    descricao: 'Rabo de cavalo com mechas verde-limão e estilo urbano. Direção ágil e mini-turbo estendido.',
    imagem: '/assets/aistudio/Mascote_feminina_zone_0a68e750.png',
    corPrincipal: '#0A0A0A',
    corDestaque: '#C6FF00',
    bonusVelocidade: 1.0,
    bonusTurbo: 1.12,
    bonusControle: 1.08,
  },
};

export interface AdversarioConfig {
  id: string;
  nome: string;
  corKart: string;
  corNeon: string;
  corCapacete: string;
  /** Fator de velocidade da IA (variado para corrida competitiva) */
  ritmoBase: number;
  /** Deslocamento lateral preferido na pista */
  faixaPreferida: number;
}

/** 5 adversários controlados por IA com nomes ligados ao universo gamer/tech */
export const ADVERSARIOS_IA: AdversarioConfig[] = [
  {
    id: 'pixelbot',
    nome: 'PixelBot',
    corKart: '#141824',
    corNeon: '#00F0FF',
    corCapacete: '#00F0FF',
    ritmoBase: 0.94,
    faixaPreferida: -0.35,
  },
  {
    id: 'byteracer',
    nome: 'ByteRacer',
    corKart: '#1B1422',
    corNeon: '#B84DFF',
    corCapacete: '#D28BFF',
    ritmoBase: 0.97,
    faixaPreferida: 0.3,
  },
  {
    id: 'lagzero',
    nome: 'LagZero',
    corKart: '#1A1E16',
    corNeon: '#C6FF00',
    corCapacete: '#FFFFFF',
    ritmoBase: 0.99,
    faixaPreferida: -0.15,
  },
  {
    id: 'glitchx',
    nome: 'GlitchX',
    corKart: '#241319',
    corNeon: '#FF3B5C',
    corCapacete: '#FF6B84',
    ritmoBase: 0.92,
    faixaPreferida: 0.42,
  },
  {
    id: 'cyberfox',
    nome: 'CyberFox',
    corKart: '#221B12',
    corNeon: '#FFB800',
    corCapacete: '#FFD15C',
    ritmoBase: 0.95,
    faixaPreferida: 0.05,
  },
];

export interface SkinKartConfig {
  id: SkinId;
  nome: string;
  subtitulo: string;
  corChassi: string;
  corNeon: string;
  corSecundaria: string;
  custoMoedas: number;
}

export const SKINS_KART: SkinKartConfig[] = [
  {
    id: 'padrao',
    nome: 'Obsidian Lime',
    subtitulo: 'Edição Oficial Zone Play',
    corChassi: '#101014',
    corNeon: '#C6FF00',
    corSecundaria: '#24242C',
    custoMoedas: 0,
  },
  {
    id: 'volt',
    nome: 'Volt Cyan',
    subtitulo: 'Chassi Carbono + Ciano Elétrico',
    corChassi: '#0E141C',
    corNeon: '#00F0FF',
    corSecundaria: '#1D2B3A',
    custoMoedas: 10,
  },
  {
    id: 'plasma',
    nome: 'Solar Flare',
    subtitulo: 'Preto Fosco + Âmbar Neon',
    corChassi: '#16120E',
    corNeon: '#FFB800',
    corSecundaria: '#2D2418',
    custoMoedas: 20,
  },
  {
    id: 'hyper',
    nome: 'Hyper Titanium',
    subtitulo: 'Branco Metálico + Lima Neon',
    corChassi: '#EAEAEF',
    corNeon: '#C6FF00',
    corSecundaria: '#18181F',
    custoMoedas: 35,
  },
];

export interface ItemConfig {
  id: ItemType;
  nome: string;
  descricao: string;
  cor: string;
}

export const ITENS_INFO: Record<ItemType, ItemConfig> = {
  turbo_z: {
    id: 'turbo_z',
    nome: 'Turbo Z',
    descricao: 'Impulso instantâneo de alta velocidade com chama verde-limão.',
    cor: '#C6FF00',
  },
  missil_neon: {
    id: 'missil_neon',
    nome: 'Míssil Neon',
    descricao: 'Dispara um projétil guiado que persegue o adversário à frente.',
    cor: '#00F0FF',
  },
  oleo: {
    id: 'oleo',
    nome: 'Mancha de Óleo',
    descricao: 'Solta uma poça escorregadia atrás do kart que faz rivais rodopiarem.',
    cor: '#FFB800',
  },
  escudo_zone: {
    id: 'escudo_zone',
    nome: 'Escudo Zone',
    descricao: 'Barreira energética por 6s que bloqueia mísseis, óleo e colisões.',
    cor: '#C6FF00',
  },
};

export interface PistaMeta {
  id: TrackId;
  nome: string;
  tema: string;
  dificuldade: 'Fácil' | 'Média' | 'Difícil';
  descricao: string;
  corCeu: string;
  corNeblina: string;
  corAsfalto: string;
  corBorda: string;
  corTerreno: string;
  larguraPista: number;
}

export const PISTAS_META: Record<TrackId, PistaMeta> = {
  zone_circuit: {
    id: 'zone_circuit',
    nome: 'Zone Circuit',
    tema: 'Cidade Noturna Neon',
    dificuldade: 'Fácil',
    descricao: 'Avenidas noturnas cercadas por arranha-céus iluminados, rampa urbana e atalho pelo beco neon.',
    corCeu: '#07090F',
    corNeblina: '#0A0D16',
    corAsfalto: '#171920',
    corBorda: '#C6FF00',
    corTerreno: '#0B0D12',
    larguraPista: 20,
  },
  arena_gamer: {
    id: 'arena_gamer',
    nome: 'Arena Gamer',
    tema: 'Estádio de E-Sports',
    dificuldade: 'Média',
    descricao: 'Circuito técnico dentro de uma arena lotada com telões gigantes, duas rampas e atalho sob o palco.',
    corCeu: '#06070B',
    corNeblina: '#090B12',
    corAsfalto: '#151822',
    corBorda: '#C6FF00',
    corTerreno: '#0D1018',
    larguraPista: 19,
  },
  lime_desert: {
    id: 'lime_desert',
    nome: 'Lime Desert',
    tema: 'Deserto com Brilho Verde',
    dificuldade: 'Difícil',
    descricao: 'Dunas escuras sob o luar com cristais verde-limão, curvas longas de drift e atalho no cânion.',
    corCeu: '#070B08',
    corNeblina: '#0B120D',
    corAsfalto: '#1A1F18',
    corBorda: '#C6FF00',
    corTerreno: '#121810',
    larguraPista: 19,
  },
};
