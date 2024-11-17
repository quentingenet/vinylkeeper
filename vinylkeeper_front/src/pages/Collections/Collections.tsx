import { Box, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { growItem } from "@utils/Animations";
import CollectionItem from "@components/Collections/CollectionItem";
import { useEffect, useState } from "react";
import ModalCollectionCreate from "@components/Collections/ModalCollectionCreate";
import useDetectMobile from "@hooks/useDetectMobile";
import { getCollections } from "@services/CollectionService";
import { ICollection } from "@models/ICollectionForm";
import { useUserContext } from "@contexts/UserContext";

export default function Collections() {
  const [isPublic, setIsPublic] = useState<boolean>(false);

  const [openModal, setOpenModal] = useState(false);
  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);
  const [collections, setCollections] = useState<ICollection[]>([]);

  const { isLoading, setIsLoading } = useUserContext();
  const { isMobile } = useDetectMobile();

  useEffect(() => {
    setIsLoading(true);
    getCollections()
      .then((res) => {
        console.log("Collections:", res.data);
        setCollections(res.data.collections);
      })
      .catch((error) => {
        console.error("Error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <>
      <ModalCollectionCreate openModal={openModal} handleClose={handleClose} />
      <Box
        display={"flex"}
        gap={1}
        flexDirection={"row"}
        justifyContent={"center"}
        alignItems={"center"}
        sx={{ cursor: "pointer" }}
        onClick={() => handleOpen()}
      >
        <AddCircleOutlineIcon
          fontSize="large"
          sx={{
            color: "#C9A726",
            animation: `${growItem} 1s ease infinite`,
          }}
        />
        <Box>
          <Typography variant="h3">Create a new collection</Typography>
        </Box>
      </Box>
      <Box
        display={isMobile ? "flex" : "grid"}
        flexDirection={isMobile ? "column" : "row"}
        flexWrap={isMobile ? "nowrap" : "wrap"}
        gridTemplateColumns={isMobile ? "repeat(1, 1fr)" : "repeat(3, 1fr)"}
        justifyContent={isMobile ? "center" : "flex-start"}
        alignItems={isMobile ? "center" : "flex-start"}
        gap={4}
        marginY={isMobile ? 1 : 3}
      >
        {isLoading ? (
          <Typography>Chargement...</Typography>
        ) : collections.length > 0 ? (
          collections.map((collection) => (
            <CollectionItem
              key={collection.id}
              name={collection.name}
              description={collection.description}
              createdAt={collection.registered_at}
              setIsPublic={setIsPublic}
              isPublic={collection.is_public}
            />
          ))
        ) : (
          <Typography sx={{ textAlign: "center" }}>
            No collection found...
          </Typography>
        )}
      </Box>
    </>
  );
}
