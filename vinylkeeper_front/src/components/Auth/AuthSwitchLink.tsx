import { Link, Typography } from "@mui/material";

interface AuthSwitchLinkProps {
  prompt: string;
  actionLabel: string;
  onClick: () => void;
}

export default function AuthSwitchLink({ prompt, actionLabel, onClick }: AuthSwitchLinkProps) {
  return (
    <Typography variant="caption" color="black" sx={{ display: "block", textAlign: "center", mt: 1 }}>
      {prompt}{" "}
      <Link
        component="button"
        type="button"
        variant="caption"
        onClick={onClick}
        sx={{ fontWeight: "bold", color: "inherit", verticalAlign: "baseline" }}
      >
        {actionLabel}
      </Link>
    </Typography>
  );
}
