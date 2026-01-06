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
} from "chart.js";
import { Album, Person, ArrowForward } from "@mui/icons-material";
import styles from "../../styles/pages/Dashboard.module.scss";
import Counter from "@utils/Counter";
import { growItem } from "@utils/Animations";
import { useQuery } from "@tanstack/react-query";
import { dashboardApiService } from "@services/DashboardApiService";
import { IDashboardStats, LatestAddition } from "@models/IDashboardStats";
import useDetectMobile from "@hooks/useDetectMobile";
import { truncateText } from "@utils/GlobalUtils";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import VinylSpinner from "@components/UI/VinylSpinner";
import TutorialModal from "@components/Modals/TutorialModal";
import { useUserContext } from "@contexts/UserContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";

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
        backgroundColor: "#2c2c2e",
        color: "#e4e4e4",
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
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApiService.getStats(),
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to refetch on mount
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);

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
  // is_tutorial_seen is calculated by backend based on number_of_connections > 2
  useEffect(() => {
    if (currentUser && !currentUser.is_tutorial_seen) {
      setShowTutorial(true);
    }
  }, [currentUser]);

  // Utility function to transform LatestAddition into PlaybackItem
  const toPlaybackItem = (
    addition: LatestAddition | undefined,
    type: "album" | "artist"
  ): PlaybackItem | null => {
    if (!addition) return null;

    const externalId = addition.external_id
      ? addition.external_id
      : addition.id.toString();

    // Validate that external ID is numeric
    if (!/^\d+$/.test(externalId)) {
      console.warn(
        `Non-numeric external ID for ${type}:`,
        externalId,
        addition
      );
      return null;
    }

    return {
      id: externalId,
      title: addition.name,
      artist: addition.name,
      image_url: addition.image_url,
      itemType: type,
    };
  };

  useEffect(() => {
    setPlaybackModalOpen(false);
    setSelectedPlaybackItem(null);
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <VinylSpinner />
      </Box>
    );
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
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <VinylSpinner />
      </Box>
    );
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
        backgroundColor: ["#c9a726", "#b0b0b0", "#d4a574"],
        borderColor: "grey",
        borderWidth: 0.2,
        borderAlign: "inner" as const,
      },
    ],
  };

  const chartOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: true,
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
          color: "#FFFFFF",
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
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed || context.raw || 0;
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
      onClick={() => redirectTo && navigate(redirectTo)}
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
    <Box p={3} sx={{ backgroundColor: "#313132", color: "#e4e4e4" }}>
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
                color="#c9a726"
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
                color="#b0b0b0"
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
                  color: "#C9A726",
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
                          backgroundColor: "#2c2c2e",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        <Album
                          sx={{
                            color: "#b0b0b0",
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
                backgroundColor: "#2c2c2e",
                color: "#e4e4e4",
                boxShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
                cursor: "pointer",
                transition:
                  "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.02)",
                  boxShadow: "4px 4px 8px rgba(0, 0, 0, 0.7)",
                },
              }}
              onClick={() => navigate("/explore")}
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
                    color: "#c9a726",
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
                    color: "#e4e4e4",
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
                      color: "#b0b0b0",
                      fontWeight: 400,
                    }}
                  >
                    shared collections
                  </Typography>
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#b0b0b0",
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
                    color: "#c9a726",
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
                      color: "#c9a726",
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
                    color: "#b0b0b0",
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
                  "& canvas": {
                    cursor: "pointer",
                  },
                }}
              >
                <Doughnut data={chartData} options={chartOptions} />
                <Box
                  sx={{
                    position: "absolute",
                    top: "47%",
                    left: "50%",
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
                      color: "#c9a726",
                      fontWeight: "bold",
                      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
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
                      color: "#e4e4e4",
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
                <Link
                  to="/explore"
                  style={{
                    color: "#c9a726",
                    textDecoration: "none",
                    fontSize: "1.25rem",
                    fontWeight: 500,
                    fontFamily:
                      "Roboto,Oswald,  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                    textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                    transition: "all 0.2s ease-in-out",
                    display: "inline-block",
                    transform: "scale(1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  Discover community collections
                </Link>
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
          // Tutorial seen status is managed by backend based on number_of_connections
          // No need to store in localStorage anymore
        }}
      />
    </Box>
  );
}
