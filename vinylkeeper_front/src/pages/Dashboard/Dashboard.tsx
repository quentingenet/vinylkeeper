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
        borderColor: "#c9a726",
        tension: 0.1,
      },
    ],
  };

  const doughnutChartData = {
    labels: ["Rock", "Pop", "Jazz", "Hip-Hop", "Classical"],
    datasets: [
      {
        data: [25, 15, 20, 10, 30],
        backgroundColor: [
          "#c9a726",
          "#b0b0b0",
          "#353538",
          "#4a4a4c",
          "#5c5c5c",
        ],
      },
    ],
  };

  const chartOptions = {
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
        ticks: { color: "#FFFFFF" },
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
      <Paper className={styles.card}>
        <Typography className={styles.textTitleShadow} variant="h6">
          {title}
        </Typography>
        <Typography variant="h4">
          <Counter target={value} duration={duration} /> {unit}
        </Typography>
      </Paper>
    </div>
  );
  return (
    <>
      <Box p={3} sx={{ backgroundColor: "#313132", color: "#e4e4e4" }}>
        <div className={styles.dashboard}>
          {renderStatCard("Total albums", 120, 2000)}
          {renderStatCard("Genres", 8, 1500)}
          {renderStatCard("Recently added", 5, 1500)}
          {renderStatCard("My collections", 4, 1500)}
          {renderStatCard("Loans", 4, 1500)}
          {renderStatCard("Value", 1958, 1500, "$")}

          <div className={styles.rowCenter}>
            <div className={styles.chart}>
              <Paper className={styles.card}>
                <Typography
                  className={styles.textTitleShadow}
                  variant="h6"
                  gutterBottom
                >
                  Albums Added Over Time
                </Typography>
                <Line data={lineChartData} options={chartOptions} />
              </Paper>
            </div>

            <div className={styles.chart}>
              <Paper className={styles.card}>
                <Typography
                  className={styles.textTitleShadow}
                  variant="h6"
                  gutterBottom
                >
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
