module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
  },
  purge: {
    content: [
      "./themes/haru/layouts/**/*.html",
      "./themes/haru/layouts/*.html",
    ],
  },
  theme: {
    container: {
      screens: {
        sm: "100%",
        md: "100%",
        lg: "900px",
        xl: "900px",
      },
    },
    extend: {
      height: (theme) => ({
        "screen-1/2": "50vh",
        "screen-1/3": "calc(100vh / 3)",
        "screen-1/4": "25vh",
        "screen-1/5": "calc(100vh / 5)",
        "screen-2/3": "calc(100vh * (2/3))",
        "screen-3/4": "75vh",
      }),
      width: (theme) => ({
        "screen-1/2": "50vw",
        "screen-1/3": "calc(100vw / 3)",
        "screen-1/4": "25vw",
        "screen-1/5": "calc(100vw / 5)",
        "screen-2/3": "calc(100vw * (2/3))",
        "screen-3/4": "75vw",
      }),
    },
  },
  variants: {},
  plugins: [],
};
