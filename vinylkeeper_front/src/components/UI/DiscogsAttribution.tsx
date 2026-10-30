import { Link, Typography } from "@mui/material";

interface DiscogsAttributionProps {
  /** The Discogs page of the data shown next to it */
  href: string;
  /** "Data provided by" by default; e.g. "Collection data provided by" */
  lead?: string;
}

/** Next to data coming from Discogs, with a link to its Discogs page, as Discogs' terms ask. */
export default function DiscogsAttribution({ href, lead = "Data provided by" }: DiscogsAttributionProps) {
  return (
    <Typography variant="caption" color="text.secondary" component="p">
      {lead}{" "}
      <Link href={href} target="_blank" rel="noopener noreferrer" color="inherit" underline="always">
        Discogs
      </Link>
      .
    </Typography>
  );
}
