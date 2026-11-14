import { ItemType } from '../game/config';

export function ZoneLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 74"
      className={className}
      role="img"
      aria-label="Zone Play"
    >
      <defs>
        <linearGradient id="zp-lime" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D8FF33" />
          <stop offset="100%" stopColor="#A6E600" />
        </linearGradient>
      </defs>
      {/* Emblema Z estilizado */}
      <polygon
        points="8,10 66,10 58,24 30,24 58,24 24,52 56,52 48,64 2,64 10,50 38,24 4,24"
        fill="url(#zp-lime)"
        stroke="#0A0A0A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M18 37 L46 37" stroke="#0A0A0A" strokeWidth="3.5" />
      {/* Tipografia futurista ZONE PLAY */}
      <text
        x="80"
        y="40"
        fill="#FFFFFF"
        fontFamily="Chakra Petch, sans-serif"
        fontWeight="700"
        fontStyle="italic"
        fontSize="36"
        letterSpacing="2"
      >
        ZONE <tspan fill="#C6FF00">PLAY</tspan>
      </text>
      <text
        x="82"
        y="61"
        fill="#A1A1AA"
        fontFamily="Chakra Petch, sans-serif"
        fontWeight="600"
        fontSize="14"
        letterSpacing="4.5"
      >
        KART ARCADE 3D
      </text>
    </svg>
  );
}

export function ItemIcon({ item, size = 36 }: { item: ItemType | null; size?: number }) {
  if (!item) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="26"
          height="26"
          rx="6"
          fill="#111216"
          stroke="#2E323D"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <text
          x="16"
          y="21"
          textAnchor="middle"
          fill="#525866"
          fontFamily="Chakra Petch, sans-serif"
          fontWeight="700"
          fontSize="15"
        >
          ?
        </text>
      </svg>
    );
  }

  if (item === 'turbo_z') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="6" fill="#101806" stroke="#C6FF00" strokeWidth="2" />
        <polygon points="18,5 8,18 15,18 13,27 24,14 17,14" fill="#C6FF00" />
      </svg>
    );
  }

  if (item === 'missil_neon') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="6" fill="#07171B" stroke="#00F0FF" strokeWidth="2" />
        <path d="M9 23 L13 19 M19 7 L25 7 L25 13 L15 23 L9 17 Z" fill="#00F0FF" />
        <circle cx="20" cy="12" r="2" fill="#0A0A0A" />
      </svg>
    );
  }

  if (item === 'oleo') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="6" fill="#1B1406" stroke="#FFB800" strokeWidth="2" />
        <path
          d="M16 7 C12 13 9 16 9 20 A7 7 0 0 0 23 20 C23 16 20 13 16 7 Z"
          fill="#FFB800"
        />
        <circle cx="13.5" cy="20.5" r="1.5" fill="#0A0A0A" />
      </svg>
    );
  }

  // escudo_zone
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#101806" stroke="#C6FF00" strokeWidth="2" />
      <path
        d="M16 6 L24 9.5 V16 C24 21 20.5 24.8 16 26.5 C11.5 24.8 8 21 8 16 V9.5 Z"
        fill="none"
        stroke="#C6FF00"
        strokeWidth="2.5"
      />
      <path d="M13 13 H19 L13 19 H19" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
