import { useId } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Tooltip, Typography } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

export interface FilterChipOption<T extends string | number> {
  value: T;
  label: string;
  count: number;
  tooltip?: string | null;
}

interface FilterChipGroupProps<T extends string | number> {
  title: string;
  options: FilterChipOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  defaultExpanded?: boolean;
}

export default function FilterChipGroup<T extends string | number>({
  title,
  options,
  selected,
  onToggle,
  defaultExpanded = true,
}: FilterChipGroupProps<T>) {
  const summaryId = useId();
  if (options.length === 0) return null;

  // Shown in the header so active filters stay visible while the group is collapsed
  const selectedLabels = options.filter((option) => selected.includes(option.value)).map((option) => option.label);

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      slotProps={{ region: { "aria-labelledby": summaryId } }}
      sx={{ backgroundColor: "transparent", "&::before": { display: "none" } }}
    >
      <AccordionSummary
        id={summaryId}
        expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
        sx={{ px: 0, "& .MuiAccordionSummary-content": { alignItems: "baseline", gap: 1, minWidth: 0 } }}
      >
        <Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: "bold", flexShrink: 0 }}>
          {title}
        </Typography>
        {selectedLabels.length > 0 && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {selectedLabels.join(", ")}
          </Typography>
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0, display: "flex", flexWrap: "wrap", gap: 1 }}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          const chip = (
            <Chip
              label={`${option.label} (${option.count})`}
              clickable
              color={isSelected ? "primary" : "default"}
              variant={isSelected ? "filled" : "outlined"}
              onClick={() => onToggle(option.value)}
              aria-pressed={isSelected}
            />
          );
          return option.tooltip ? (
            // describeChild: the tooltip describes the chip instead of replacing its accessible name
            <Tooltip key={option.value} title={option.tooltip} arrow describeChild>
              {chip}
            </Tooltip>
          ) : (
            <Box component="span" key={option.value}>
              {chip}
            </Box>
          );
        })}
      </AccordionDetails>
    </Accordion>
  );
}
