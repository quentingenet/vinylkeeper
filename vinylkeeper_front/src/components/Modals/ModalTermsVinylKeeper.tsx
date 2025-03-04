import { Box, Modal, Typography } from "@mui/material";

interface ModalTermsVinylKeeperProps {
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
}

export default function ModalTermsVinylKeeper(
  props: ModalTermsVinylKeeperProps
) {
  const { setOpenTermsModal, openTermsModal } = props;

  const handleClose = () => setOpenTermsModal(false);

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    overflowY: "scroll",
    transform: "translate(-50%, -50%)",
    width: {
      xs: "90%",
      sm: "60%",
      md: "50%",
      lg: "40%",
      xl: "30%",
    },
    maxHeight: "50%",
    bgcolor: "#f9f9f9",
    border: "2px solid #000",
    boxShadow: 24,
    opacity: 0.8,
    p: 2,
  };
  return (
    <>
      <Modal
        open={openTermsModal}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography
            variant="h6"
            component="h2"
            sx={{
              color: "black",
              textAlign: "center",
            }}
          >
            Terms of Use for the Vinyl Keeper Application
          </Typography>
          <Typography
            id="modal-modal-description"
            sx={{ mt: 2, color: "black" }}
          >
            <strong>
              Vinyl Keeper is a free and open-source application licensed under
              GPLv3, developed by Quentin Genet. The purpose of the Application
              is to provide a tool for managing vinyl collections while
              promoting freedom to share and modify the software.
              <br /> The Application is available on the website
              https://vinylkeeper.org.
            </strong>
            <br />
            <strong>
              <center>Legal Information</center>
            </strong>
            <br />
            Website owner, administrator, and webmaster contact: Quentin Genet.
            Website hosting: Hostinger - Registered in France. Contact and
            address details available via the Hostinger website.
            <br />
            <strong>1. Acceptance of Terms of Use</strong>
            <br />
            1.1. The use of the Vinyl Keeper application (hereinafter referred
            to as the "Application") is subject to the unconditional acceptance
            of these Terms of Use (hereinafter referred to as "Terms").
            <br />
            1.2. The user acknowledges having read the Terms carefully and
            agrees to comply with all the provisions stated herein.
            <br />
            <strong>2. Personal Use</strong> <br />
            2.1. The Application is designed solely for personal purposes of
            managing vinyl collections.
            <br />
            2.2. The user is encouraged to consult a professional for any
            specific advice related to their collection or its value.
            <br />
            <strong>3. User Responsibility</strong> <br />
            3.1. The user is entirely responsible for their decisions and
            actions resulting from the use of the Vinyl Keeper Application.
            <br />
            3.2. The creators of the Application disclaim any responsibility for
            the consequences resulting from the actions taken by the user based
            on the information provided by the Application.
            <br />
            <strong>4. No Warranty</strong> <br />
            4.1. The Vinyl Keeper Application is provided "as is" under GPLv3
            without warranty of accuracy, reliability, or fitness for a
            particular purpose.
            <br />
            4.2. The creators of the Application do not guarantee the results
            obtained from the use of the Application and cannot be held
            responsible for errors, inaccuracies, or omissions in the
            information provided.
            <br />
            <strong>5. Commitment to User Freedom and Privacy</strong>
            <br />
            5.1. As a GPLv3-licensed application, Vinyl Keeper promotes user
            freedom, ensuring the right to study, share, and modify the
            software.
            <br />
            5.2. The creators of the Vinyl Keeper Application commit to not
            disclosing user data to third parties for advertising or marketing
            purposes. No personal information will be sold, rented, or shared
            without explicit consent.
            <br />
            <strong>6. Service Interruption</strong> <br />
            6.1. The user acknowledges that the Application may experience
            temporary interruptions for technical, maintenance, or other
            reasons, and the creators of the Application are not responsible for
            disruptions in use.
            <br />
            <strong>7. Collection and Use of Data</strong> <br />
            7.1. The user consents to the collection, storage, and use of their
            data in accordance with the privacy policy of the Vinyl Keeper
            Application, accessible on the Application's website.
            <br />
            <strong>8. Modification of Terms of Use</strong> <br />
            8.1. The creators of the Vinyl Keeper Application reserve the right
            to modify the Terms at any time. It is the user's responsibility to
            regularly check for updates.
            <br />
            <strong>9. Applicable Law and Jurisdiction</strong> <br />
            9.1. These Terms are governed by French law. Any dispute arising
            from the use of the Application falls under the exclusive
            jurisdiction of French courts.
          </Typography>
          <Typography sx={{ mt: 2, color: "black" }}>
            <strong>Last updated: 13/01/2025</strong>
          </Typography>
        </Box>
      </Modal>
    </>
  );
}
