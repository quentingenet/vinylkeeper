import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import useDetectMobile from "@hooks/useDetectMobile";

interface PaginationWithEllipsisProps {
  count: number;
  page: number;
  onChange: (page: number) => void;
  color?: "primary" | "secondary";
  size?: "small" | "medium" | "large";
  sx?: any;
}

export default function PaginationWithEllipsis({
  count,
  page,
  onChange,
  color = "primary",
  size = "medium",
  sx = {},
}: PaginationWithEllipsisProps) {
  const { isMobile } = useDetectMobile();
  const maxVisiblePages = isMobile ? 3 : 4;

  const getVisiblePages = () => {
    if (count <= maxVisiblePages) {
      return Array.from({ length: count }, (_, i) => i + 1);
    }

    if (isMobile) {
      if (page <= 2) {
        return [1, 2, 3, "...", count];
      } else if (page >= count - 1) {
        return [1, "...", count - 2, count - 1, count];
      } else {
        return [1, "...", page, "...", count];
      }
    } else {
      const delta = Math.floor(maxVisiblePages / 2);
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, page - delta);
        i <= Math.min(count - 1, page + delta);
        i++
      ) {
        range.push(i);
      }

      if (page - delta > 2) {
        rangeWithDots.push(1, "...");
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (page + delta < count - 1) {
        rangeWithDots.push("...", count);
      } else {
        rangeWithDots.push(count);
      }

      return rangeWithDots;
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= count) {
      onChange(newPage);
    }
  };

  const visiblePages = getVisiblePages();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      gap={isMobile ? 0.5 : 1}
      sx={{
        justifyContent: "center",
        ...sx,
      }}
    >
      <Button
        variant="outlined"
        size={size}
        onClick={() => handlePageChange(page - 1)}
        disabled={page <= 1}
        sx={{
          minWidth: isMobile ? "32px" : "40px",
          width: isMobile ? "32px" : "40px",
          height: isMobile ? "32px" : "40px",
          color: color === "primary" ? "#C9A726" : undefined,
          borderColor: color === "primary" ? "#C9A726" : undefined,
          "&:hover": {
            borderColor: color === "primary" ? "#B8961F" : undefined,
          },
          "&:disabled": {
            borderColor: "rgba(255, 255, 255, 0.12)",
            color: "rgba(255, 255, 255, 0.38)",
          },
        }}
      >
        <ChevronLeft />
      </Button>

      {visiblePages.map((pageNum, index) => (
        <React.Fragment key={index}>
          {pageNum === "..." ? (
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                px: isMobile ? 0.5 : 1,
                userSelect: "none",
                width: isMobile ? "24px" : "40px",
                textAlign: "center",
                fontSize: isMobile ? "0.75rem" : "0.875rem",
              }}
            >
              ...
            </Typography>
          ) : (
            <Button
              variant={pageNum === page ? "contained" : "outlined"}
              size={size}
              onClick={() => handlePageChange(pageNum as number)}
              sx={{
                minWidth: isMobile ? "32px" : "40px",
                width: isMobile ? "32px" : "40px",
                height: isMobile ? "32px" : "40px",
                fontSize: isMobile ? "0.75rem" : "0.875rem",
                color:
                  pageNum === page
                    ? "white"
                    : color === "primary"
                    ? "#C9A726"
                    : undefined,
                backgroundColor:
                  pageNum === page && color === "primary"
                    ? "#C9A726"
                    : pageNum === page
                    ? undefined
                    : "transparent",
                borderColor: color === "primary" ? "#C9A726" : undefined,
                "&:hover": {
                  backgroundColor:
                    pageNum === page
                      ? color === "primary"
                        ? "#B8961F"
                        : undefined
                      : "rgba(201, 167, 38, 0.08)",
                  borderColor: color === "primary" ? "#B8961F" : undefined,
                },
              }}
            >
              {pageNum}
            </Button>
          )}
        </React.Fragment>
      ))}

      <Button
        variant="outlined"
        size={size}
        onClick={() => handlePageChange(page + 1)}
        disabled={page >= count}
        sx={{
          minWidth: isMobile ? "32px" : "40px",
          width: isMobile ? "32px" : "40px",
          height: isMobile ? "32px" : "40px",
          color: color === "primary" ? "#C9A726" : undefined,
          borderColor: color === "primary" ? "#C9A726" : undefined,
          "&:hover": {
            borderColor: color === "primary" ? "#B8961F" : undefined,
          },
          "&:disabled": {
            borderColor: "rgba(255, 255, 255, 0.12)",
            color: "rgba(255, 255, 255, 0.38)",
          },
        }}
      >
        <ChevronRight />
      </Button>
    </Box>
  );
}
