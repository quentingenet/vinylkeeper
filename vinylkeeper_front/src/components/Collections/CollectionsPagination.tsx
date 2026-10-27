import { Box } from "@mui/material";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import useDetectMobile from "@hooks/useDetectMobile";

interface CollectionsPaginationProps {
  totalPages: number;
  page: number;
  onChange: (page: number) => void;
}

export default function CollectionsPagination({
  totalPages,
  page,
  onChange,
}: CollectionsPaginationProps) {
  const { isMobile } = useDetectMobile();

  if (totalPages <= 1) return null;

  return (
    <Box display="flex" justifyContent="center" mt={4} mb={2}>
      <PaginationWithEllipsis
        count={totalPages}
        page={page}
        onChange={onChange}
        color="primary"
        size={isMobile ? "medium" : "large"}
      />
    </Box>
  );
}
