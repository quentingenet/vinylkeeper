import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import { Box, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import { truncateText } from "@utils/GlobalUtils";

/**
 * CollectionItem Component
 *
 * A card component that displays a collection's information including:
 * - Collection name
 * - Description
 * - Creation date
 * - Public/Private status toggle
 *
 * @component
 * @example
 * ```tsx
 * <CollectionItem
 *   name="My Collection"
 *   description="A collection of vinyl records"
 *   createdAt={new Date()}
 * />
 * ```
 *
 * @param {Object} props - Component props
 * @param {string} props.name - The name of the collection
 * @param {string} props.description - A description of the collection
 * @param {Date} props.createdAt - The date when the collection was created
 *
 * @returns {JSX.Element} A card displaying collection information
 */

interface CollectionItemProps {
  name: string;
  description: string;
  createdAt: string;
  setIsPublic: (isPublic: boolean) => void;
  isPublic: boolean;
}

export default function CollectionItem({
  name,
  description,
  createdAt,
  setIsPublic,
  isPublic,
}: CollectionItemProps) {
  return (
    <Card
      sx={{
        width: 350,
        position: "relative",
        boxShadow: "0px 0px 3px 0px #000000",
        transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
        "&:hover": {
          boxShadow: "0px 0px 6px 0px #000000",
        },
      }}
    >
      <CardActionArea>
        <CardMedia
          component="img"
          height="140"
          sx={{ objectFit: "cover", backgroundColor: "#C9A726", opacity: 0.8 }}
          image="/images/vinylKeeper.svg"
          alt="VinylKeeper"
        />
        <CardContent>
          <Typography
            gutterBottom
            variant="h5"
            component="div"
            sx={{ textShadow: "0px 0px 3px #000000" }}
          >
            {truncateText(name, 15)}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {truncateText(description, 120)}
          </Typography>
        </CardContent>
      </CardActionArea>

      <CardActions>
        <Box
          display={"flex"}
          flexDirection={"row"}
          justifyContent={"center"}
          alignItems={"center"}
          gap={1}
        >
          <FormControlLabel
            sx={{ paddingX: 1 }}
            control={
              <Switch
                size="small"
                color="default"
                checked={isPublic}
                onChange={(e) => {
                  setIsPublic(e.target.checked);
                }}
              />
            }
            label={isPublic ? "Public" : "Private"}
          />
          <Typography variant="body2" sx={{ position: "absolute", right: 8 }}>
            Created at {new Date(createdAt).toLocaleDateString()}
          </Typography>
        </Box>
      </CardActions>
    </Card>
  );
}
