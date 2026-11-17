import { Alert, Box, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { Translate } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "@hooks/useLanguagePreference";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type LanguagePreference } from "@utils/i18n";

// The Select holds strings: "auto" stands for null, the language of the device
const AUTOMATIC = "auto";

/** Language of the interface: one of the languages of the app, or the one of the device. */
export default function LanguageSection() {
  const { t } = useTranslation("settingsUsersVk");
  const { preference, choose, isPending, isError } = useLanguagePreference();

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Translate sx={{ color: "primary.main", mr: 1 }} />
          <Typography variant="h6">{t("language.title")}</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {t("language.description")}
        </Typography>
        <FormControl sx={{ minWidth: 240 }} disabled={isPending}>
          <InputLabel id="language-select-label">{t("common:language.label")}</InputLabel>
          <Select
            labelId="language-select-label"
            label={t("common:language.label")}
            value={preference ?? AUTOMATIC}
            onChange={(event) => {
              const value = event.target.value;
              choose(value === AUTOMATIC ? null : (value as LanguagePreference));
            }}
          >
            <MenuItem value={AUTOMATIC}>{t("common:language.automatic")}</MenuItem>
            {SUPPORTED_LANGUAGES.map((language) => (
              <MenuItem key={language} value={language} lang={language}>
                {LANGUAGE_NAMES[language]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t("language.saveError")}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
