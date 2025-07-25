import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Album, Person } from "@mui/icons-material";
import styles from "../../styles/pages/Dashboard.module.scss";
import Counter from "@utils/Counter";
import { useQuery } from "@tanstack/react-query";
import { dashboardApiService } from "@services/DashboardApiService";
import { IDashboardStats, LatestAddition } from "@models/IDashboardStats";
import useDetectMobile from "@hooks/useDetectMobile";
import { truncateText } from "@utils/GlobalUtils";
import VinylSpinner from "@components/UI/VinylSpinner";
import TutorialModal from "@components/Modals/TutorialModal";
import { useUserContext } from "@contexts/UserContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

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
                src={data.image_url}
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

  // Show tutorial for new users who haven't seen it yet
  useEffect(() => {
    if (currentUser) {
      // If user has 1 or more connections, mark tutorial as seen in localStorage
      if (currentUser.number_of_connections >= 1) {
        localStorage.setItem(`tutorial_seen_${currentUser.user_uuid}`, "true");
      }

      // Show tutorial only for new users
      if (
        !currentUser.is_tutorial_seen &&
        currentUser.number_of_connections <= 1
      ) {
        const hasSeenTutorial = localStorage.getItem(
          `tutorial_seen_${currentUser.user_uuid}`
        );
        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }
      }
    }
  }, [currentUser]);

  // Utility function to transform LatestAddition into PlaybackItem
  const toPlaybackItem = (
    addition: LatestAddition | undefined,
    type: "album" | "artist"
  ): PlaybackItem | null => {
    if (!addition) return null;
    return {
      id: addition.external_id ? addition.external_id : addition.id.toString(),
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
  if (isError || !data) {
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

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((ds, idx) => ({
      label: ds.label,
      data: ds.data,
      borderColor: idx === 0 ? "#c9a726" : "#b0b0b0",
      backgroundColor: "transparent",
      tension: 0.1,
    })),
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: { display: true, labels: { color: "#FFFFFF" } },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        ticks: { color: "#FFFFFF" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      y: {
        type: "linear",
        beginAtZero: true,
        suggestedMin: 0,
        ticks: {
          color: "#FFFFFF",
          stepSize: 1,
          callback: function (value: any) {
            return Number.isInteger(Number(value)) ? value : null;
          },
        },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
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
          <div className={styles.chart}>
            <Paper className={styles.card}>
              <Typography
                className={styles.textTitleShadow}
                variant="h6"
                gutterBottom
              >
                Global added on {new Date().getFullYear()}
              </Typography>
              <Line data={chartData} options={chartOptions} />
            </Paper>
          </div>
        </div>

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
          // Mark tutorial as seen for this user in localStorage
          if (currentUser) {
            localStorage.setItem(
              `tutorial_seen_${currentUser.user_uuid}`,
              "true"
            );
          }
        }}
      />
    </Box>
  );
}
