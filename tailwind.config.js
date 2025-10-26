/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            h1: { fontWeight: '700' },
            h2: {
              fontWeight: '700',
              borderBottom: `1px solid ${theme('colors.neutral.300')}`,
              paddingBottom: '.4rem',
              marginTop: '1.25em',
              marginBottom: '.6em',
            },
            hr: {
              borderColor: theme('colors.neutral.300'),
            },
            a: {
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            },
            'ul,ol': {
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },
            ul: {
              listStyleType: 'disc',
            },
            ol: {
              listStyleType: 'decimal',
            },
            'ul > li, ol > li': {
              marginTop: '.25em',
              marginBottom: '.25em',
            },
            blockquote: {
              borderLeftColor: theme('colors.neutral.300'),
              backgroundColor: theme('colors.neutral.100'),
              padding: '.75em 1em',
              borderRadius: '.5rem',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '1em',
              marginBottom: '1.25em',
              fontSize: '0.95rem',
              borderRadius: '.5rem',
              overflow: 'hidden',
            },
            'thead th': {
              backgroundColor: theme('colors.neutral.100'),
              fontWeight: '700',
              textAlign: 'left',
            },
            'th, td': {
              border: `1px solid ${theme('colors.neutral.300')}`,
              padding: '.6em .75em',
            },
            'tbody tr:nth-child(odd)': {
              backgroundColor: theme('colors.neutral.50'),
            },
            img: {
              borderRadius: '.5rem',
              marginTop: '1em',
              marginBottom: '1em',
            },
            code: {
              backgroundColor: theme('colors.neutral.100'),
              padding: '.15em .35em',
              borderRadius: '.35rem',
            },
          },
        },
        invert: {
          css: {
            h2: {
              borderBottomColor: theme('colors.neutral.700'),
            },
            hr: {
              borderColor: theme('colors.neutral.700'),
            },
            a: {
              color: theme('colors.sky.300'),
            },
            blockquote: {
              borderLeftColor: theme('colors.neutral.700'),
              backgroundColor: 'rgba(127,127,127,0.08)',
            },
            'thead th': {
              backgroundColor: 'rgba(127,127,127,0.12)',
            },
            'th, td': {
              borderColor: theme('colors.neutral.700'),
            },
            'tbody tr:nth-child(odd)': {
              backgroundColor: 'rgba(127,127,127,0.06)',
            },
            code: {
              backgroundColor: 'rgba(127,127,127,0.16)',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],

  // ---- Purge-proof classes used by ArticleView / FloatAd header & ads ----
  safelist: [
    // Header bottle / header row utilities
    'max-w-[560px]',
    'translate-x-[10px]',
    'md:max-h-[180px]',
    'w-[180px]',

    // FloatAd image width caps
    'max-w-[75%]',
    'max-w-[80%]',

    // FloatAd container sizes (right: Homesteader)
    'w-[289px]','h-[170px]','md:w-[300px]','md:h-[180px]','lg:w-[320px]','lg:h-[190px]',
    // FloatAd container sizes (left: Beaverlodge)
    'w-[320px]','h-[158px]','md:w-[328px]','md:h-[170px]','lg:w-[340px]','lg:h-[180px]',
  ],
};
