import { Typography } from "@mui/material";

interface AppVersionProps {
  /** In the bottom right corner of its parent instead of centered at its bottom */
  corner?: boolean;
  /** In the flow of its parent (under an icon, for instance) instead of laid over it */
  inline?: boolean;
}

/**
 * The version of the app, tiny and greyed out at the very bottom of the menu: centered, or in its bottom
 * right corner with `corner`. Laid over the menu, not in its flow: it adds no height, so the menu never
 * has to scroll because of it. `inline` puts it in the flow instead.
 */
export default function AppVersion({ corner = false, inline = false }: AppVersionProps) {
  if (inline) {
    return (
      <Typography
        variant="caption"
        component="p"
        sx={{ m: 0, color: "text.secondary", opacity: 0.5, fontSize: "0.55rem", lineHeight: 1, whiteSpace: "nowrap", pointerEvents: "none" }}
      >
        v{__APP_VERSION__}
      </Typography>
    );
  }
  return (
    <Typography
      variant="caption"
      component="p"
      sx={{
        position: "absolute",
        bottom: 8,
        right: corner ? 8 : "auto",
        // Centered at the bottom: from the middle of the parent, pulled back by half its own width
        left: corner ? "auto" : "50%",
        transform: corner ? "none" : "translateX(-50%)",
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
