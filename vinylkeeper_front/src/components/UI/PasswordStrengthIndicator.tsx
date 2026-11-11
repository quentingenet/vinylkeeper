import { Box, Typography, LinearProgress } from "@mui/material";
import {
  passwordAtLeast8,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";
import { colors } from "@styles/colors";

interface PasswordStrengthIndicatorProps {
  password: string;
  /** On a light background (the sign up and reset forms): black text. Otherwise the colors of the theme. */
  onLight?: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  onLight = false,
}: PasswordStrengthIndicatorProps) {
  const textColor = onLight ? colors.black : "text.secondary";
  const checks = [
    {
      label: "At least 8 characters",
      test: passwordAtLeast8.test(password),
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
    if (strength <= 33) return colors.error;
    if (strength <= 66) return colors.warning;
    return colors.success;
  };

  const getStrengthText = (strength: number) => {
    if (strength <= 33) return "Weak";
    if (strength <= 66) return "Medium";
    return "Strong";
  };

  // The rules are shown before the first key: a new password is easier to choose when they are known
  const typing = password.length > 0;

  return (
    <Box sx={{ mt: 1 }} data-testid="password-rules">
      {typing && (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="caption" sx={{ color: textColor, fontSize: "0.85rem" }}>
              Password strength
            </Typography>
            <Typography variant="caption" sx={{ color: textColor, fontSize: "0.85rem", fontWeight: 700 }}>
              {getStrengthText(strength)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={strength}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.grey200,
              "& .MuiLinearProgress-bar": {
                backgroundColor: getStrengthColor(strength),
              },
            }}
          />
        </>
      )}
      <Box sx={{ mt: typing ? 1 : 0 }}>
        {checks.map((check, index) => (
          <Typography
            key={index}
            variant="caption"
            sx={{
              color: onLight ? colors.black : check.test ? "success.main" : "text.secondary",
              // Black text does not turn green: a rule that is met is bold
              fontWeight: check.test ? 700 : 400,
              display: "block",
              fontSize: "0.85rem",
            }}
          >
            {check.test ? "✓" : "○"} {check.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
