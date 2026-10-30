import { Box } from "@mui/material";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { colors } from "@styles/colors";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BAR_HEIGHT = 30;
const VERTICAL_HEIGHT = 260;

export interface BarEntry {
  label: string;
  count: number;
  /** A bar without onSelect action, such as "Others" */
  disabled?: boolean;
}

interface BreakdownBarChartProps {
  entries: BarEntry[];
  /** Bars along the y axis: long labels (genres, moods) stay readable */
  horizontal?: boolean;
  onSelect?: (index: number) => void;
  ariaLabel: string;
}

/** Records per era, genre or mood: one gold bar each, a click opens Spinning now on it. */
export default function BreakdownBarChart({ entries, horizontal = false, onSelect, ariaLabel }: BreakdownBarChartProps) {
  const selectable = (index: number) => Boolean(onSelect) && !entries[index]?.disabled;

  const data = {
    labels: entries.map((entry) => entry.label),
    datasets: [
      {
        label: "Records",
        data: entries.map((entry) => entry.count),
        backgroundColor: entries.map((entry) => (entry.disabled ? colors.textSecondary : colors.gold)),
        hoverBackgroundColor: entries.map((entry) => (entry.disabled ? colors.textSecondary : colors.goldHover)),
        borderRadius: 4,
        maxBarThickness: 36,
      },
    ],
  };

  const valueAxis = {
    beginAtZero: true,
    ticks: { color: colors.textSecondary, precision: 0 },
    grid: { color: colors.surface },
  };
  const labelAxis = {
    ticks: { color: colors.textMuted, font: { size: 13 } },
    grid: { display: false },
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => `${context.parsed[horizontal ? "x" : "y"]} records` } },
    },
    scales: horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis },
    onClick: (_event, elements) => {
      const index = elements[0]?.index;
      if (index !== undefined && selectable(index)) onSelect?.(index);
    },
    onHover: (event, elements) => {
      const target = event.native?.target as HTMLElement | undefined;
      if (target) target.style.cursor = elements.length > 0 && selectable(elements[0].index) ? "pointer" : "default";
    },
  };

  return (
    // minWidth 0: the canvas follows the card, never the other way round
    <Box sx={{ position: "relative", width: "100%", minWidth: 0, height: horizontal ? entries.length * BAR_HEIGHT + 40 : VERTICAL_HEIGHT }}>
      <Bar data={data} options={options} aria-label={ariaLabel} role="img" />
    </Box>
  );
}
