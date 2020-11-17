const isDev = process.env.HUGO_ENV === "development";

module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
  },
  purge: {
    enabled: !isDev,
    mode: "all",
    content: [
      "./layouts/**/*.html",
      "./layouts/*.html",
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
      colors: {
        twitter: "#1da1f2",
        linkedin: "#0077B5",
        gmail: "#D14836",
        github: "#181717",
        instagram: "#E4405F",
      },
    },
  },
  variants: {},
  plugins: [],
};
