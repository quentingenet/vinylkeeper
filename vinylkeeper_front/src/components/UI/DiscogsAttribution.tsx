import { Link, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

interface DiscogsAttributionProps {
  /** The Discogs page of the data shown next to it */
  href: string;
  /** "Data provided by" (translated) by default; e.g. "Collection data provided by" */
  lead?: string;
}

/** Next to data coming from Discogs, with a link to its Discogs page, as Discogs' terms ask. */
export default function DiscogsAttribution({ href, lead }: DiscogsAttributionProps) {
  const { t } = useTranslation();
  return (
    <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
      {lead ?? t("dataProvidedBy")}{" "}
      <Link href={href} target="_blank" rel="noopener noreferrer" color="inherit" underline="always">
        Discogs
      </Link>.
          </Typography>
  );
}
