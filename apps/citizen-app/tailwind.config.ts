import type { Config } from 'tailwindcss'

// Design tokens extracted verbatim from Citizen App Screens.dc.html wireframe.
// Background: warm cream (#F4F1EA), Primary: teal (#0F766E), Emergency red: #B3261E
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F766E',
          dark: '#0D6359',
          light: '#E9F3F0',
          lighter: '#FBF8F3',
          success: '#0E6B3A',
        },
        surface: {
          page: '#F4F1EA',
          card: '#FFFFFF',
          dark: '#1B2422',
        },
        text: {
          primary: '#1B2422',
          secondary: '#5B6B68',
          muted: '#7A8884',
          on_dark: '#FFFFFF',
        },
        border: {
          DEFAULT: '#EAE5DC',
          strong: '#D8D3C8',
        },
        emergency: {
          DEFAULT: '#B3261E',
          dark: '#8C1D1D',
          bg: '#FBE3E3',
        },
        warning: {
          DEFAULT: '#D98C0E',
          text: '#8A5A00',
          bg: '#FBF0D9',
        },
        success: {
          DEFAULT: '#1E9E5C',
          bg: '#DFF5E9',
          text: '#0E6B3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
        btn: '8px',
      },
      maxWidth: {
        mobile: '390px',
      },
    },
  },
  plugins: [],
}
export default config
