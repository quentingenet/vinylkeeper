import type { ReactNode } from "react";
import { Avatar, Box, Button, Card, CardContent, Typography } from "@mui/material";
import { LibraryAdd, Public } from "@mui/icons-material";
import Counter from "@utils/Counter";
import useDetectMobile from "@hooks/useDetectMobile";
import { colors } from "@styles/colors";

/** The look of the "Latest Album" and "Latest Artist" cards below them: icon and title, then the content. */
function InfoCard({
  title,
  icon,
  color,
  onClick,
  children,
}: {
  title: string;
  icon: ReactNode;
  color: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Card
      sx={{
        backgroundColor: colors.paper,
        color: colors.textMuted,
        height: "100%",
        boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: color, mr: 1 }}>{icon}</Avatar>
          <Typography variant="h6" sx={{ color }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

interface NewMemberCardsProps {
  /** Spots of the Vinyl Atlas */
  spotsCount: number;
  onOpenAtlas: () => void;
  onAddRecord: () => void;
}

/**
 * What a member with no record and no artist yet sees in place of the empty "My albums" and "My artists"
 * counters: an invitation to start the collection, then the Atlas, which has something to show.
 */
export default function NewMemberCards({ spotsCount, onOpenAtlas, onAddRecord }: NewMemberCardsProps) {
  const { isMobile } = useDetectMobile();

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        width: "100%",
        maxWidth: "800px",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <Box sx={{ flex: 1 }}>
        <InfoCard title="Start your collection" icon={<LibraryAdd />} color={colors.gold}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Add now to your collection some records or artists.
          </Typography>
          <Button variant="contained" onClick={onAddRecord}>
            Add a record
          </Button>
        </InfoCard>
      </Box>
      <Box sx={{ flex: 1 }}>
        <InfoCard title="Atlas spots" icon={<Public />} color={colors.gold} onClick={onOpenAtlas}>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            {spotsCount === 0 ? "-" : <Counter target={spotsCount} duration={900} />}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            places to dig, shared by the community
          </Typography>
        </InfoCard>
      </Box>
    </Box>
  );
}
