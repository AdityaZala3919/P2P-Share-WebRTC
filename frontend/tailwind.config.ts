import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#08090C',
          sidebar: '#0D0F14',
          card: '#131720',
          cardHover: '#181D28',
          border: '#1A202C',
          cyan: '#00FFFF',
          cyanHover: '#33FFFF',
          cyanDim: 'rgba(0, 255, 255, 0.12)',
          green: '#00FF88',
          muted: '#7E8B9B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
} satisfies Config
