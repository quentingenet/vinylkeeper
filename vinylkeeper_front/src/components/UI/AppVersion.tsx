import { Typography } from "@mui/material";

/**
 * The version of the app, tiny and greyed out at the very bottom of the menu: centered, or in its bottom
 * right corner with `corner`. Laid over the menu, not in its flow: it adds no height, so the menu never
 * has to scroll because of it.
 */
export default function AppVersion({ corner = false }: { corner?: boolean }) {
  return (
    <Typography
      variant="caption"
      component="p"
      sx={{
        position: "absolute",
        bottom: 8,
        right: corner ? 8 : 0,
        left: corner ? "auto" : 0,
        m: 0,
        color: "text.secondary",
        opacity: 0.5,
        fontSize: "0.55rem",
        lineHeight: 1,
        textAlign: corner ? "right" : "center",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      v{__APP_VERSION__}
    </Typography>
  );
}
