import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import {
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  Snackbar,
  Alert,
} from "@mui/material";
import { useEffect, useState } from "react";
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
import {
  CollectionResponse,
  CollectionListItemResponse,
} from "@services/CollectionApiService";

interface IModalCollectionProps {
  openModal: boolean;
  isUpdatingCollection: boolean;
  handleClose: () => void;
  onCollectionAdded: () => void;
  collection?: CollectionResponse | CollectionListItemResponse;
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
}: IModalCollectionProps) {
  const userContext = useUserContext();
  const queryClient = useQueryClient();
  const { isMobile } = useDetectMobile();

  const [errorSnackbar, setErrorSnackbar] = useState({
    open: false,
    message: "",
  });

  const isFullCollection = (
    c?: CollectionResponse | CollectionListItemResponse
  ): c is CollectionResponse => {
    return c !== undefined && "albums" in c && "artists" in c;
  };

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
      album_ids: isFullCollection(collection)
        ? collection.albums.map((album) => album.id)
        : [],
      artist_ids: isFullCollection(collection)
        ? collection.artists.map((artist) => artist.id)
        : [],
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

  // Custom mutation for collection creation with error handling
  const createCollectionMutation = useMutation({
    mutationFn: collectionApiService.createCollection,
    onSuccess: () => {
      onCollectionAdded();
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      handleClose();
    },
    onError: (error: any) => {
      // Check if it's a duplicate collection name error
      if (
        error?.code === 2001 &&
        error?.message?.includes("Collection name already exists")
      ) {
        setErrorSnackbar({
          open: true,
          message:
            "Collection name already exists. Please choose a different name.",
        });
      } else {
        setErrorSnackbar({
          open: true,
          message:
            "An error occurred while creating the collection. Please try again.",
        });
      }
    },
  });

  const handleCreateCollection = (data: ICollectionForm) => {
    createCollectionMutation.mutate(data);
  };

  const updateMutation = useMutation<
    { message: string },
    Error,
    { id: number; data: ICollectionUpdateForm }
  >({
    mutationFn: ({ id, data }) =>
      collectionApiService.updateCollection(id, data),
    onSuccess: (_, variables) => {
      // Optimistic update instead of full invalidation
      queryClient.setQueryData(
        ["collections", userContext.currentUser?.user_uuid],
        (oldData: any) => {
          if (!oldData?.items) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item: any) =>
              item.id === variables.id
                ? {
                    ...item,
                    name: variables.data.name,
                    description: variables.data.description,
                    is_public: variables.data.is_public,
                  }
                : item
            ),
          };
        }
      );
      onCollectionAdded();
      handleClose();
    },
    onError: (error: any) => {
      // Check if it's a duplicate collection name error
      if (
        error?.code === 2001 &&
        error?.message?.includes("Collection name already exists")
      ) {
        setErrorSnackbar({
          open: true,
          message:
            "Collection name already exists. Please choose a different name.",
        });
      } else {
        setErrorSnackbar({
          open: true,
          message:
            "An error occurred while updating the collection. Please try again.",
        });
      }
      userContext.setIsLoading(false);
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
      handleCreateCollection(data);
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
    <>
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
                  disabled={
                    createCollectionMutation.isPending ||
                    updateMutation.isPending
                  }
                >
                  {createCollectionMutation.isPending
                    ? "Creating..."
                    : updateMutation.isPending
                    ? "Updating..."
                    : isUpdatingCollection
                    ? "Update"
                    : "Create"}
                </Button>
              </Box>
            </Box>
          </form>
        </Fade>
      </Modal>

      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbar({ open: false, message: "" })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setErrorSnackbar({ open: false, message: "" })}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
