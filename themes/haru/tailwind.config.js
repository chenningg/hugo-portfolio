module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
  },
  purge: {
    enabled: true,
    content: [
      "./themes/haru/layouts/**/*.html",
      "./themes/haru/layouts/*.html",
    ],
  },
  theme: {
    extend: {
      height: (theme) => ({
        "screen-1/2": "50vh",
        "screen-1/3": "calc(100vh / 3)",
        "screen-1/4": "25vh",
        "screen-1/5": "calc(100vh / 5)",
        "screen-2/3": "calc(100vh * (2/3))",
        "screen-3/4": "75vh",
      }),
    },
  },
  variants: {},
  plugins: [],
};
