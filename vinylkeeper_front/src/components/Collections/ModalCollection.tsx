import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { Button, FormControlLabel, IconButton, Switch } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { collectionValidationSchema } from "@utils/validators/collection";
import { useUserContext } from "@contexts/UserContext";
import {
  ICollectionForm,
  ICollectionUpdateForm,
} from "@models/ICollectionForm";
import { collectionApiService } from "@services/CollectionApiService";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useDetectMobile from "@hooks/useDetectMobile";
import { CollectionResponse } from "@services/CollectionApiService";

interface IModalCollectionCreateProps {
  openModal: boolean;
  isUpdatingCollection: boolean;
  handleClose: () => void;
  onCollectionAdded: () => void;
  collection?: CollectionResponse;
  isPublic: boolean;
  setIsPublic: (isPublic: boolean) => void;
}

export default function ModalCollection({
  openModal,
  isUpdatingCollection,
  handleClose,
  onCollectionAdded,
  collection,
  isPublic,
}: IModalCollectionCreateProps) {
  const userContext = useUserContext();
  const queryClient = useQueryClient();
  const { isMobile } = useDetectMobile();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<ICollectionForm>({
    defaultValues: {
      name: collection?.name ?? "",
      description: collection?.description ?? "",
      album_ids: collection?.albums?.map((album) => album.id) ?? [],
      artist_ids: collection?.artists?.map((artist) => artist.id) ?? [],
      is_public: collection?.is_public ?? isPublic,
    },
    resolver: yupResolver(collectionValidationSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (openModal) {
      setValue("name", collection?.name || "");
      setValue("description", collection?.description || "");
      setValue("is_public", collection?.is_public ?? isPublic);
    }
  }, [openModal, collection, setValue]);

  const createMutation = useMutation<
    { message: string },
    Error,
    ICollectionForm
  >({
    mutationFn: collectionApiService.createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onCollectionAdded();
    },
    onError: (error) => {
      console.error("Error creating collection:", error);
      userContext.setIsLoading(false);
    },
    onSettled: () => {
      handleClose();
    },
  });

  const updateMutation = useMutation<
    { message: string },
    Error,
    { id: number; data: ICollectionUpdateForm }
  >({
    mutationFn: ({ id, data }) =>
      collectionApiService.updateCollection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onCollectionAdded();
    },
    onError: () => {
      userContext.setIsLoading(false);
    },
    onSettled: () => {
      handleClose();
    },
  });

  const submitCollection = (data: ICollectionForm) => {
    if (!isValid) {
      return;
    }

    if (isUpdatingCollection && collection?.id) {
      // For update, only send the fields that can be updated
      const updateData: ICollectionUpdateForm = {
        name: data.name,
        description: data.description,
        is_public: data.is_public,
        mood_id: data.mood_id,
      };
      updateMutation.mutate({ id: collection.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "80%" : "30%",
    bgcolor: "background.paper",
    borderRadius: 2,
    boxShadow: 24,
    p: 2,
  };

  return (
    <Modal
      open={openModal}
      onClose={handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
    >
      <Fade in={openModal}>
        <form onSubmit={handleSubmit(submitCollection)}>
          <Box sx={style}>
            <Box display="flex" justifyContent="flex-end">
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box
              display={"flex"}
              flexDirection={"row"}
              alignItems={"center"}
              justifyContent={"space-around"}
              gap={1}
              paddingY={1}
              marginX={1}
            >
              <Typography
                id="transition-modal-title"
                variant="h3"
                component="h2"
                color={"#C9A726"}
                sx={{ textAlign: "center", width: isMobile ? "75%" : "50%" }}
                marginBottom={1}
              >
                {isUpdatingCollection ? "Updating" : "Creating a new"}
                {" collection"}
              </Typography>
              <FormControlLabel
                sx={{ width: isMobile ? "25%" : "15%" }}
                control={
                  <Switch
                    checked={watch("is_public")}
                    color="default"
                    {...register("is_public")}
                  />
                }
                label={watch("is_public") ? "Public" : "Private"}
              />
            </Box>
            <Box
              display={"flex"}
              flexDirection={"column"}
              justifyContent={"center"}
              gap={2}
            >
              <TextField
                sx={{
                  width: isMobile ? "100%" : "85%",
                  display: "flex",
                  alignSelf: "center",
                }}
                error={!!errors.name?.message}
                label="Name"
                helperText={errors.name?.message}
                {...register("name")}
              />
              <TextField
                sx={{
                  width: isMobile ? "100%" : "85%",
                  display: "flex",
                  alignSelf: "center",
                }}
                error={!!errors.description?.message}
                helperText={errors.description?.message}
                multiline
                label="Description"
                rows={4}
                {...register("description")}
              />
            </Box>
            <Box display={"flex"} justifyContent={"center"} marginTop={2}>
              <Button
                sx={{ alignSelf: "center" }}
                variant="contained"
                color="primary"
                type="submit"
              >
                {isUpdatingCollection ? "Update" : "Create"}
              </Button>
            </Box>
          </Box>
        </form>
      </Fade>
    </Modal>
  );
}
