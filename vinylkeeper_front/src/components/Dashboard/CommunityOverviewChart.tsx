import { Box, Typography } from "@mui/material";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { colors } from "@styles/colors";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CommunityOverviewChartProps {
  albums: number;
  artists: number;
  places: number;
  isMobile: boolean;
}

/** Albums, artists and Atlas spots of the whole community, in one doughnut. */
export default function CommunityOverviewChart({ albums, artists, places, isMobile }: CommunityOverviewChartProps) {
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
    if (!chartContainerRef.current) return;
    const legendItems = chartContainerRef.current.querySelectorAll(".chartjs-legend li");
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

    return () => cleanupFunctions.forEach((cleanup) => cleanup());
  }, [albums, artists, places]);

  const chartData = {
    labels: ["Albums", "Artists", "Atlas spots"],
    datasets: [
      {
        label: "Global Totals",
        data: [albums, artists, places],
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
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
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
          {(albums + artists + places).toLocaleString()}
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
  );
}
