import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import Typography from "@mui/material/Typography";
import useDetectMobile from "@hooks/useDetectMobile";
import TextField from "@mui/material/TextField";
import { Button, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { collectionValidationSchema } from "@utils/validators/collectionValidationSchema";
import { useUserContext } from "@contexts/UserContext";
import { ICollectionForm } from "@models/ICollectionForm";
import { createCollection } from "@services/CollectionService";

interface IModalCollectionCreateProps {
  openModal: boolean;
  handleClose: () => void;
}

export default function ModalCollectionCreate({
  openModal,
  handleClose,
}: IModalCollectionCreateProps) {
  const userContext = useUserContext();
  const { isMobile } = useDetectMobile();
  const [isPublic, setIsPublic] = useState(true);
  const [openSnackBar, setOpenSnackBar] = useState(false);
  const {
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
  } = useForm<ICollectionForm>({
    defaultValues: { name: "", description: "", is_public: true },
    resolver: yupResolver(collectionValidationSchema),
  });

  const submitCollection = () => {
    if (!isValid) return;

    userContext.setIsLoading(true);
    createCollection(watch())
      .then((response) => {})
      .catch(() => setOpenSnackBar(true))
      .finally(() => userContext.setIsLoading(false));
  };

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "80%" : 500,
    bgcolor: "background.paper",
    border: "none",
    borderRadius: 2,
    boxShadow: 24,
    p: 2,
  };
  return (
    <div>
      <Modal
        aria-labelledby="transition-modal-title"
        aria-describedby="transition-modal-description"
        open={openModal}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={openModal}>
          <form onSubmit={handleSubmit(submitCollection)}>
            <Box sx={style}>
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
                  sx={{ width: isMobile ? "75%" : "50%" }}
                  marginBottom={1}
                >
                  Creating a new collection
                </Typography>

                <FormControlLabel
                  sx={{ width: isMobile ? "25%" : "15%" }}
                  control={
                    <Switch
                      checked={isPublic}
                      color="default"
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                  }
                  label={isPublic ? "Public" : "Private"}
                  {...control.register("is_public")}
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
                  helperText={errors.name?.message}
                  label="Name"
                  {...control.register("name")}
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
                  rows={4}
                  label="Description"
                  {...control.register("description")}
                />

                <Button
                  sx={{ alignSelf: "center" }}
                  variant="contained"
                  color="primary"
                  type="submit"
                >
                  Create
                </Button>
              </Box>
            </Box>
          </form>
        </Fade>
      </Modal>
    </div>
  );
}