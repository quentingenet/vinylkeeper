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
import { collectionValidationSchema } from "@utils/validators/collectionValidationSchema";
import { useUserContext } from "@contexts/UserContext";
import { ICollection, ICollectionForm } from "@models/ICollectionForm";
import { collectionApiService } from "@services/CollectionApiService";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useDetectMobile from "@hooks/useDetectMobile";

interface IModalCollectionCreateProps {
  openModal: boolean;
  isUpdatingCollection: boolean;
  handleClose: () => void;
  onCollectionAdded: () => void;
  collection?: ICollection;
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
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
    setValue,
    register,
  } = useForm<ICollectionForm>({
    defaultValues: {
      name: isUpdatingCollection ? collection?.name : "",
      description: isUpdatingCollection ? collection?.description : "",
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

  const createMutation = useMutation<ICollection, Error, ICollectionForm>({
    mutationFn: collectionApiService.createCollection,
    onSuccess: (data) => {
      console.log("🔧 DEBUG: Collection created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onCollectionAdded();
    },
    onError: (error) => {
      console.error("🔧 DEBUG: Error creating collection:", error);
      userContext.setIsLoading(false);
    },
    onSettled: () => {
      console.log("🔧 DEBUG: Create mutation settled");
      handleClose();
    },
  });

  const updateMutation = useMutation<
    ICollection,
    Error,
    { id: number; data: ICollectionForm }
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
    console.log("🔧 DEBUG: Submitting collection data:", data);
    console.log("🔧 DEBUG: isValid:", isValid);

    if (!isValid) {
      console.log("🔧 DEBUG: Form is not valid, stopping submission");
      return;
    }

    if (isUpdatingCollection && collection?.id) {
      console.log("🔧 DEBUG: Updating collection with ID:", collection.id);
      updateMutation.mutate({ id: collection.id, data });
    } else {
      console.log("🔧 DEBUG: Creating new collection");
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
