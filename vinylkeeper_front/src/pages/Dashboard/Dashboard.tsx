import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import { Album, Person, ArrowForward } from "@mui/icons-material";
import styles from "../../styles/pages/Dashboard.module.scss";
import Counter from "@utils/Counter";
import { growItem } from "@utils/Animations";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@utils/queryKeys";
import { dashboardApiService } from "@services/DashboardApiService";
import { IDashboardStats, LatestAddition } from "@models/IDashboardStats";
import useDetectMobile from "@hooks/useDetectMobile";
import { truncateText } from "@utils/GlobalUtils";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import LoadingCenter from "@components/UI/LoadingCenter";
import TutorialModal from "@components/Modals/TutorialModal";
import { useUserContext } from "@contexts/UserContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { toPlaybackItem } from "@utils/toPlaybackItem";
import { COMMUNITY_COLLECTIONS_URL, EGlobalUrls } from "@utils/GlobalUrls";
import CollectionStatsCard from "@components/Dashboard/CollectionStatsCard";
import { colors } from "@styles/colors";

const LatestAdditionCard = ({
  title,
  data,
  icon,
  color,
  onClick,
}: {
  title: string;
  data?: LatestAddition;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) => {
  const { isMobile } = useDetectMobile();

  return (
    <Card
      sx={{
        backgroundColor: colors.paper,
        color: colors.textMuted,
        height: "100%",
        boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ bgcolor: color, mr: 1 }}>{icon}</Avatar>
          <Typography variant="h6" sx={{ color: color }}>
            {title}
          </Typography>
        </Box>
        {data ? (
          <Box
            display="flex"
            flexDirection={isMobile ? "column" : "row"}
            alignItems={isMobile ? "center" : "flex-start"}
            gap={2}
          >
            {data.image_url && (
              <img
                src={buildProxyImageUrl(
                  data.image_url,
                  isMobile ? 300 : 200,
                  isMobile ? 300 : 200,
                  85,
                  true
                )}
                alt={data.name}
                style={{
                  width: isMobile ? "150px" : "100px",
                  height: isMobile ? "150px" : "100px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />
            )}
            <Box flex={1} textAlign={isMobile ? "center" : "left"}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
                {truncateText(data.name, 55)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Added by{" "}
                <span style={{ color: color, fontWeight: "bold" }}>
                  {data.username}
                </span>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(data.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No recent additions
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const { isMobile } = useDetectMobile();
  const { currentUser } = useUserContext();
  const [showTutorial, setShowTutorial] = useState(false);
  const navigate = useNavigate();
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);

  const { data, isLoading, isError } = useQuery<IDashboardStats>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => dashboardApiService.getStats(),
    staleTime: 30 * 1000,
  });

  // Show tutorial for new users who haven't seen it yet
  // We persist tutorial seen status in localStorage to avoid showing it multiple times in the same session
  useEffect(() => {
    if (currentUser && !currentUser.is_tutorial_seen) {
      const tutorialSeenKey = `tutorial_seen_${currentUser.user_uuid}`;
      const hasSeenTutorialInSession =
        localStorage.getItem(tutorialSeenKey) === "true";

      if (!hasSeenTutorialInSession) {
        setShowTutorial(true);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    setPlaybackModalOpen(false);
    setSelectedPlaybackItem(null);
  }, []);

  if (isLoading) {
    return <LoadingCenter />;
  }
  if (!isLoading && isError) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <Typography color="error">Failed to load dashboard data.</Typography>
      </Box>
    );
  }

  if (!data) {
    return <LoadingCenter />;
  }

  const renderStatCard = (
    title: string,
    value: number,
    duration: number,
    unit: string = "",
    redirectTo: string = ""
  ) => (
    <div
      className={styles.stat}
      onClick={() => { if (redirectTo) void navigate(redirectTo); }}
      style={{ cursor: redirectTo ? "pointer" : "default" }}
    >
      <Paper className={`${styles.card} ${styles.statCard}`}>
        <Typography className={styles.textTitleShadow} variant="h6">
          {title}
        </Typography>
        <Typography variant="h4">
          {value === 0 ? "-" : <Counter target={value} duration={duration} />}{" "}
          {unit}
        </Typography>
      </Paper>
    </div>
  );

  return (
    <Box p={3} sx={{ backgroundColor: colors.raised, color: colors.textMuted }}>
      <div className={styles.dashboard}>
        {renderStatCard(
          "My albums",
          data?.user_albums_total ?? 0,
          1000,
          "",
          data?.user_albums_total > 0 ? "/collections" : "/add-vinyls"
        )}
        {renderStatCard(
          "My artists",
          data?.user_artists_total ?? 0,
          1200,
          "",
          data?.user_artists_total > 0 ? "/collections" : "/add-vinyls"
        )}
        {renderStatCard(
          "Atlas spots",
          data?.moderated_places_total ?? 0,
          900,
          "",
          EGlobalUrls.ATLAS
        )}

        <div className={styles.rowCenter}>
          <div
            style={{
              display: "flex",
              gap: "16px",
              width: "100%",
              maxWidth: "800px",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <div style={{ flex: 1 }}>
              <LatestAdditionCard
                title="Latest Album"
                data={data.latest_album}
                icon={<Album />}
                color={colors.gold}
                onClick={() => {
                  const item = toPlaybackItem(data.latest_album, "album");
                  if (item) {
                    setSelectedPlaybackItem(item);
                    setPlaybackModalOpen(true);
                  }
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <LatestAdditionCard
                title="Latest Artist"
                data={data.latest_artist}
                icon={<Person />}
                color={colors.textSecondary}
                onClick={() => {
                  const item = toPlaybackItem(data.latest_artist, "artist");
                  if (item) {
                    setSelectedPlaybackItem(item);
                    setPlaybackModalOpen(true);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Recently Added Mosaic */}
        {data.recent_albums && data.recent_albums.length > 0 && (
          <div className={styles.rowCenter}>
            <Box
              sx={{
                width: "100%",
                maxWidth: "800px",
                mt: 2,
                mb: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: colors.gold,
                  mb: 2,
                  fontSize: isMobile ? "1rem" : "1.25rem",
                  fontWeight: 600,
                  textAlign: "center",
                  width: "100%",
                }}
              >
                Recently added by the community
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(3, 1fr)"
                    : "repeat(6, 1fr)",
                  gap: 1.5,
                  width: "100%",
                  justifyItems: "center",
                }}
              >
                {data.recent_albums.slice(0, 12).map((album) => (
                  <Box
                    key={album.id}
                    onClick={() => {
                      const item = toPlaybackItem(album, "album");
                      if (item) {
                        setSelectedPlaybackItem(item);
                        setPlaybackModalOpen(true);
                      }
                    }}
                    sx={{
                      cursor: "pointer",
                      transition: "transform 0.2s ease-in-out",
                      width: "100%",
                      maxWidth: isMobile ? "100px" : "120px",
                      aspectRatio: "1",
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    {album.image_url ? (
                      <img
                        src={buildProxyImageUrl(
                          album.image_url,
                          200,
                          200,
                          85,
                          true
                        )}
                        alt={album.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "4px",
                          boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          backgroundColor: colors.paper,
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        <Album
                          sx={{
                            color: colors.textSecondary,
                            fontSize: isMobile ? "1.5rem" : "2rem",
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </div>
        )}

        <div className={styles.rowCenter}>
          <Box
            sx={{
              width: "100%",
              maxWidth: "800px",
              mb: 0,
            }}
          >
            <Card
              sx={{
                backgroundColor: colors.paper,
                color: colors.textMuted,
                boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                cursor: "pointer",
                transition:
                  "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "4px 4px 8px rgba(0, 0, 0, 0.7)",
                },
              }}
              onClick={() => void navigate(COMMUNITY_COLLECTIONS_URL)}
            >
              <CardContent
                sx={{
                  padding: isMobile ? 3 : 4,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: colors.gold,
                    mb: 2,
                    fontSize: isMobile ? "1.25rem" : "1.5rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <span>🌍</span>
                  Community collections
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: colors.textMuted,
                    fontWeight: "bold",
                    mb: 1,
                    fontSize: isMobile ? "2rem" : "3rem",
                    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {data?.public_collections_total === 0 ? (
                    "-"
                  ) : (
                    <Counter
                      target={data?.public_collections_total ?? 0}
                      duration={1100}
                    />
                  )}{" "}
                  <Typography
                    component="span"
                    variant="h6"
                    sx={{
                      fontSize: isMobile ? "1rem" : "1.25rem",
                      color: colors.textSecondary,
                      fontWeight: 400,
                    }}
                  >
                    shared collections
                  </Typography>
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: colors.textSecondary,
                    mb: 3,
                    fontSize: isMobile ? "0.875rem" : "1rem",
                  }}
                >
                  from vinyl lovers worldwide
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    color: colors.gold,
                    fontSize: isMobile ? "0.875rem" : "1rem",
                    fontWeight: 500,
                    fontFamily: "Oswald, sans-serif",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      gap: 1.5,
                    },
                  }}
                >
                  Explore collections now{" "}
                  <ArrowForward
                    sx={{
                      color: colors.gold,
                      fontSize: isMobile ? "1.25rem" : "1.5rem",
                      animation: `${growItem} 2s ease-in-out infinite`,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
            {data?.user_collections_total > 0 &&
              data?.user_public_collections_total === 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    mt: 3,
                    mb: 3,
                    color: colors.textSecondary,
                    fontSize: isMobile ? "0.875rem" : "0.9375rem",
                    fontWeight: 400,
                    opacity: 0.9,
                  }}
                >
                  Make one of your collections public and inspire others...
                </Typography>
              )}
          </Box>
        </div>

        <div className={styles.rowCenter}>
          <div className={styles.chart}>
            <CollectionStatsCard
              community={{
                albums: data.global_albums_total,
                artists: data.global_artists_total,
                places: data.global_places_total,
              }}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>
      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={() => setPlaybackModalOpen(false)}
        item={selectedPlaybackItem}
      />
      <TutorialModal
        open={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          if (currentUser) {
            const tutorialSeenKey = `tutorial_seen_${currentUser.user_uuid}`;
            localStorage.setItem(tutorialSeenKey, "true");
          }
        }}
      />
    </Box>
  );
}
