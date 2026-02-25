export const themeTokens = {
  base: {
    name: "base",
    accent: "blue",
  },
  alert: {
    name: "alert",
    accent: "red",
  },
} as const;

export type ThemeName = keyof typeof themeTokens;
