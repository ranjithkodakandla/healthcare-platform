import type { Config } from 'tailwindcss'

// Design tokens extracted verbatim from Provider Portal.dc.html wireframe.
// Citizen App tokens (for future use in mobile) are in a companion config.
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — Provider Portal uses a deeper teal than Citizen App
        brand: {
          DEFAULT: '#0B5C66',
          dark: '#04363D',   // sidebar bg
          light: '#DEF3F5',  // tinted bg chips
          lighter: '#F3FBFC', // very light tinted surface
        },
        // Page & surface
        surface: {
          page: '#F2F4F5',
          card: '#FFFFFF',
          input: '#F2F4F5',
          sidebar: '#04363D',
        },
        // Text
        text: {
          primary: '#1A1D1F',
          secondary: '#4A5054',
          muted: '#7C8388',
          on_brand: '#FFFFFF',
          on_brand_muted: '#8FC6BE',
        },
        // Borders
        border: {
          DEFAULT: '#E7EBEC',
          strong: '#C7CDD0',
        },
        // Semantic
        success: {
          DEFAULT: '#1E9E5C',
          muted: '#0E6B3A',
          bg: '#E6F5ED',
        },
        warning: {
          DEFAULT: '#D98C0E',
          text: '#8A5A00',
          bg: '#FBF0D9',
        },
        danger: {
          DEFAULT: '#C62E2E',
          bg: '#FDEAEA',
        },
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        chip: '4px',
      },
      boxShadow: {
        card: '0 12px 32px rgba(26,29,31,0.14)',
        'card-sm': '0 4px 12px rgba(26,29,31,0.08)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs': ['11px', { lineHeight: '16px' }],
        'sm': ['12px', { lineHeight: '18px' }],
        'base': ['13px', { lineHeight: '20px' }],
        'md': ['14px', { lineHeight: '22px' }],
        'lg': ['16px', { lineHeight: '24px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['26px', { lineHeight: '32px' }],
      },
    },
  },
  plugins: [],
}
export default config
