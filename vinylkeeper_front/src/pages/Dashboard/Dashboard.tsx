import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  type Plugin,
  type TooltipItem,
} from "chart.js";
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
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { toPlaybackItem } from "@utils/toPlaybackItem";
import { COMMUNITY_COLLECTIONS_URL } from "@utils/GlobalUrls";
import { colors } from "@styles/colors";

ChartJS.register(ArcElement, Tooltip, Legend);

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

  const chartContainerRef = useRef<HTMLDivElement>(null);
  // Real center of the doughnut (in px, relative to its container): the legend
  // below the ring shifts it, so a fixed percentage is off on small screens
  const [chartCenter, setChartCenter] = useState<{ x: number; y: number } | null>(null);
  const chartCenterPlugin = useMemo<Plugin<"doughnut">>(
    () => ({
      id: "chartCenterPosition",
      afterLayout(chart) {
        const { left, right, top, bottom } = chart.chartArea;
        const x = chart.canvas.offsetLeft + (left + right) / 2;
        const y = chart.canvas.offsetTop + (top + bottom) / 2;
        setChartCenter((previous) =>
          previous && Math.abs(previous.x - x) < 0.5 && Math.abs(previous.y - y) < 0.5
            ? previous
            : { x, y }
        );
      },
    }),
    []
  );

  useEffect(() => {
    if (chartContainerRef.current && data) {
      const legendItems =
        chartContainerRef.current.querySelectorAll(".chartjs-legend li");

      const cleanupFunctions: Array<() => void> = [];

      legendItems.forEach((item) => {
        const htmlItem = item as HTMLElement;
        htmlItem.style.cursor = "pointer";
        htmlItem.style.transition = "all 0.2s ease-in-out";
        htmlItem.style.opacity = "0.8";

        const handleMouseEnter = () => {
          htmlItem.style.opacity = "1";
          htmlItem.style.transform = "scale(1.02)";
        };

        const handleMouseLeave = () => {
          htmlItem.style.opacity = "0.8";
          htmlItem.style.transform = "scale(1)";
        };

        htmlItem.addEventListener("mouseenter", handleMouseEnter);
        htmlItem.addEventListener("mouseleave", handleMouseLeave);

        cleanupFunctions.push(() => {
          htmlItem.removeEventListener("mouseenter", handleMouseEnter);
          htmlItem.removeEventListener("mouseleave", handleMouseLeave);
        });
      });

      return () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
      };
    }
  }, [data]);

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

  const chartData = {
    labels: ["Albums", "Artists", "Places"],
    datasets: [
      {
        label: "Global Totals",
        data: [
          data.global_albums_total,
          data.global_artists_total,
          data.global_places_total,
        ],
        backgroundColor: [colors.gold, colors.textSecondary, colors.copper],
        borderColor: "grey",
        borderWidth: 0.2,
        borderAlign: "inner" as const,
      },
    ],
  };

  const chartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: true,
    // Mobile only: larger hole than the 50% default so the center total fits
    ...(isMobile && { cutout: "62%" }),
    onHover: (event, activeElements) => {
      const target = event.native?.target as HTMLElement;
      if (target) {
        target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
      }
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: colors.white,
          padding: 15,
          font: {
            size: 14,
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context: TooltipItem<"doughnut">) {
            const label = context.label || "";
            const value = context.parsed || (context.raw as number) || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

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
          "My collections",
          data?.user_collections_total ?? 0,
          1500,
          "",
          data?.user_collections_total > 0 ? "/collections" : "/add-vinyls"
        )}
        {renderStatCard(
          "Community places",
          data?.moderated_places_total ?? 0,
          900,
          "",
          "/places"
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
            <Paper className={styles.card}>
              <Typography
                className={styles.textTitleShadow}
                variant="h6"
                gutterBottom
              >
                Community activity overview
              </Typography>
              <Box
                ref={chartContainerRef}
                sx={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  maxWidth: "400px",
                  margin: "0 auto",
                  padding: 2,
                  minHeight: "300px",
                  // Mobile only: lets the center total scale with the chart width (cqi units)
                  ...(isMobile && { containerType: "inline-size" }),
                  "& canvas": {
                    cursor: "pointer",
                  },
                }}
              >
                <Doughnut data={chartData} options={chartOptions} plugins={[chartCenterPlugin]} />
                <Box
                  sx={{
                    position: "absolute",
                    top: isMobile && chartCenter ? `${chartCenter.y}px` : "47%",
                    left: isMobile && chartCenter ? `${chartCenter.x}px` : "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    pointerEvents: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      color: colors.gold,
                      fontWeight: "bold",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                      // Mobile only: shrinks with the doughnut hole instead of overflowing it
                      ...(isMobile && {
                        fontSize: "clamp(1.25rem, 8cqi, 2.125rem)",
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                      }),
                    }}
                  >
                    {(
                      data.global_albums_total +
                      data.global_artists_total +
                      data.global_places_total
                    ).toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: colors.textMuted,
                      mt: 0.5,
                      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    items
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  textAlign: "center",
                  mt: 2,
                  mb: 2,
                }}
              >
                <Box
                  component={Link}
                  to={COMMUNITY_COLLECTIONS_URL}
                  sx={{
                    color: "primary.main",
                    textDecoration: "none",
                    fontSize: "1.25rem",
                    fontWeight: 500,
                    fontFamily:
                      "Roboto,Oswald,  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                    textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                    display: "inline-block",
                    animation: `${growItem} 1.7s ease-in-out infinite`,
                  }}
                >
                  Discover community collections
                </Box>
              </Box>
            </Paper>
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
