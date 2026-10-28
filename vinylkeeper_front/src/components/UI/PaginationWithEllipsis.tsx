import React from "react";
import { Box, Button, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import useDetectMobile from "@hooks/useDetectMobile";
import { getVisiblePages } from "@utils/getVisiblePages";
import { colors } from "@styles/colors";

interface PaginationWithEllipsisProps {
  count: number;
  page: number;
  onChange: (page: number) => void;
  color?: "primary" | "secondary";
  size?: "small" | "medium" | "large";
  sx?: SxProps<Theme>;
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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= count) {
      onChange(newPage);
    }
  };

  const visiblePages = getVisiblePages(count, page, maxVisiblePages, isMobile);

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
          color: color === "primary" ? "primary.main" : undefined,
          borderColor: color === "primary" ? "primary.main" : undefined,
          "&:hover": {
            borderColor: color === "primary" ? colors.goldDark : undefined,
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
                    ? "primary.main"
                    : undefined,
                backgroundColor:
                  pageNum === page && color === "primary"
                    ? "primary.main"
                    : pageNum === page
                    ? undefined
                    : "transparent",
                borderColor: color === "primary" ? "primary.main" : undefined,
                "&:hover": {
                  backgroundColor:
                    pageNum === page
                      ? color === "primary"
                        ? colors.goldDark
                        : undefined
                      : "rgba(201, 167, 38, 0.08)",
                  borderColor: color === "primary" ? colors.goldDark : undefined,
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
          color: color === "primary" ? "primary.main" : undefined,
          borderColor: color === "primary" ? "primary.main" : undefined,
          "&:hover": {
            borderColor: color === "primary" ? colors.goldDark : undefined,
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
