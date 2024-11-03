import { Box, Typography, Paper } from "@mui/material";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import styles from "../../styles/pages/Dashboard.module.scss";
import Counter from "@utils/Counter";

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
  const lineChartData = {
    labels: ["January", "February", "March", "April", "May", "June", "July"],
    datasets: [
      {
        label: "Albums Added",
        data: [5, 10, 8, 15, 20, 25, 30],
        fill: false,
        borderColor: "#c9a726",
        tension: 0.1,
      },
    ],
  };

  const doughnutChartData = {
    labels: ["Rock", "Pop", "Jazz", "Hip-Hop", "Classical"],
    datasets: [
      {
        label: "Genres",
        data: [25, 15, 20, 10, 30],
        backgroundColor: [
          "#c9a726",
          "#b0b0b0",
          "#353538",
          "#4a4a4c",
          "#5c5c5c",
        ],
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: "#FFFFFF",
        },
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#FFFFFF",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "#FFFFFF",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };

  return (
    <>
      <Typography variant="h1" color="#C9A726">
        Dashboard
      </Typography>
      <Box p={3} sx={{ backgroundColor: "#313132", color: "#e4e4e4" }}>
        <div className={styles.dashboard}>
          <div className={styles.dashboard__stat}>
            <Paper className={styles.dashboard__card}>
              <Typography variant="h6">Total Albums</Typography>
              <Typography variant="h4">
                <Counter target={120} duration={2000} />
              </Typography>
            </Paper>
          </div>
          <div className={styles.dashboard__stat}>
            <Paper className={styles.dashboard__card}>
              <Typography variant="h6">Genres</Typography>
              <Typography variant="h4">
                <Counter target={8} duration={1500} />
              </Typography>
            </Paper>
          </div>
          <div className={styles.dashboard__stat}>
            <Paper className={styles.dashboard__card}>
              <Typography variant="h6">Recently Added</Typography>
              <Typography variant="h4">
                <Counter target={5} duration={1500} />
              </Typography>
            </Paper>
          </div>
          <div className={styles.dashboard__stat}>
            <Paper className={styles.dashboard__card}>
              <Typography variant="h6">Loans</Typography>
              <Typography variant="h4">
                <Counter target={4} duration={1500} />
              </Typography>
            </Paper>
          </div>

          <div className={styles.dashboard__rowCenter}>
            <div className={styles.dashboard__chart}>
              <Paper className={styles.dashboard__card}>
                <Typography variant="h6" gutterBottom>
                  Albums Added Over Time
                </Typography>
                <Line data={lineChartData} options={chartOptions} />
              </Paper>
            </div>

            <div className={styles.dashboard__chart}>
              <Paper className={styles.dashboard__card}>
                <Typography variant="h6" gutterBottom>
                  Collection by Genre
                </Typography>
                <Doughnut data={doughnutChartData} options={chartOptions} />
              </Paper>
            </div>
          </div>
        </div>
      </Box>
    </>
  );
}
