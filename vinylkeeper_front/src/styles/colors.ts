/**
 * Every color of the app, in one place: the four MUI themes are built from these and
 * components use them by name. Changing the brand palette starts and ends here.
 */
export const colors = {
  // Brand gold
  gold: "#c9a726",
  goldDark: "#b8961f",
  goldHover: "#b38f1f",
  // Liked items (heart icons)
  likeGold: "#ffd700",
  // Third slice of the dashboard chart
  copper: "#d4a574",

  // Text
  textLight: "#fffbf9",
  textMuted: "#e4e4e4",
  textSecondary: "#b0b0b0",
  white: "#ffffff",
  offWhite: "#f9f9f9",
  black: "#000000",

  // Surfaces, from the lightest to the darkest
  surface: "#3f3f41",
  raised: "#313132",
  raisedAlt: "#2d2d2f",
  paper: "#2c2c2e",
  panel: "#2a2a2a",
  deep: "#1f1f1f",
  // Landing page and buttons
  slate: "#2e3440",

  // Neutral greys
  grey200: "#e0e0e0",
  grey400: "#999999",
  grey500: "#888888",
  grey600: "#666666",
  grey700: "#555555",

  // Status
  success: "#4caf50",
  successDark: "#45a049",
  warning: "#ff9800",
  error: "#f44336",
  errorDark: "#d32f2f",
} as const;
