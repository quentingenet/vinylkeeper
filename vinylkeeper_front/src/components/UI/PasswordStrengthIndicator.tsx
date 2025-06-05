import { Box, Typography, LinearProgress } from "@mui/material";
import {
  passwordAtLeast4,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const checks = [
    {
      label: "At least 4 characters",
      test: passwordAtLeast4.test(password),
    },
    {
      label: "Contains a letter",
      test: passwordWithLetter.test(password),
    },
    {
      label: "Contains a number",
      test: passwordWithNumber.test(password),
    },
  ];

  const passedChecks = checks.filter((check) => check.test).length;
  const strength = (passedChecks / checks.length) * 100;

  const getStrengthColor = (strength: number) => {
    if (strength <= 33) return "#f44336";
    if (strength <= 66) return "#ff9800";
    return "#4caf50";
  };

  const getStrengthText = (strength: number) => {
    if (strength <= 33) return "Weak";
    if (strength <= 66) return "Medium";
    return "Strong";
  };

  if (!password) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Password strength
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {getStrengthText(strength)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={strength}
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: "#e0e0e0",
          "& .MuiLinearProgress-bar": {
            backgroundColor: getStrengthColor(strength),
          },
        }}
      />
      <Box sx={{ mt: 1 }}>
        {checks.map((check, index) => (
          <Typography
            key={index}
            variant="caption"
            color={check.test ? "success.main" : "text.secondary"}
            sx={{ display: "block", fontSize: "0.75rem" }}
          >
            {check.test ? "✓" : "○"} {check.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
