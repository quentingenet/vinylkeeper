import { Box, Typography, Paper, Grid, CircularProgress } from "@mui/material";
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
import styles from "../../styles/pages/Dashboard.module.scss";
import Counter from "@utils/Counter";
import { useQuery } from "@tanstack/react-query";
import { dashboardApiService } from "@services/DashboardApiService";
import { IDashboardStats } from "@models/IDashboardStats";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery<IDashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApiService.getStats(),
  });

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress color="inherit" />
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
    unit: string = ""
  ) => (
    <div className={styles.stat}>
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
        {renderStatCard("My albums", data?.user_albums_total ?? 0, 1000)}
        {renderStatCard("My artists", data?.user_artists_total ?? 0, 1200)}
        {renderStatCard(
          "My collections",
          data?.user_collections_total ?? 0,
          1500
        )}
        {renderStatCard(
          "Community places",
          data?.global_places_total ?? 0,
          900
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
      </div>
    </Box>
  );
}
