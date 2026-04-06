import { Box, Modal, Typography, Button, Link } from "@mui/material";

interface ModalTermsVinylKeeperProps {
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
}

export default function ModalTermsVinylKeeper(
  props: ModalTermsVinylKeeperProps,
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
      xs: "80%",
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
    <Modal
      open={openTermsModal}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      disableAutoFocus
      disableEnforceFocus
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
          Terms of Use — Vinyl Keeper
        </Typography>

        <Typography id="modal-modal-description" sx={{ mt: 2, color: "black" }}>
          <strong>
            Vinyl Keeper is a free and open-source application licensed under
            GPLv3, developed by Quentin Genet. The purpose of the Application is
            to provide a tool for managing vinyl collections while promoting the
            freedom to share and modify the software.
            <br />
          </strong>
          <br />

          <Typography sx={{ mt: 1, textAlign: "center", color: "black" }}>
            The Application is available at
            <br />
            https://vinylkeeper.org
            <br />
            <Link
              href="https://github.com/quentingenet/vinylkeeper"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source code (GitHub)
            </Link>
          </Typography>

          <Typography sx={{ mt: 2, textAlign: "center", color: "black" }}>
            <strong>Last updated: 18/06/2026</strong>
          </Typography>

          <br />
          <br />

          <Typography sx={{ textAlign: "center", color: "black" }}>
            <strong>Legal Information</strong>
          </Typography>
          <br />
          The website is owned and administered by Quentin Genet. Hosting is
          provided by Hostinger – a company registered in Lithuania. Contact and
          address details for the hosting provider can be found on the Hostinger
          website.
          <br />
          <br />

          <strong>1. Acceptance of Terms of Use</strong>
          <br />
          1.1. The use of the Vinyl Keeper application (hereinafter referred to
          as the "Application") is subject to the unconditional acceptance of
          these Terms of Use (hereinafter referred to as "Terms").
          <br />
          1.2. The user acknowledges having read the Terms carefully and agrees
          to comply with all the provisions stated herein.
          <br />
          <br />

          <strong>2. Personal Use</strong>
          <br />
          2.1. The Application is intended solely for personal use in managing
          vinyl collections.
          <br />
          2.2. Users are encouraged to consult a professional for any advice
          regarding the value or management of their collection.
          <br />
          <br />

          <strong>3. User Responsibility</strong>
          <br />
          3.1. The user is entirely responsible for their decisions and actions
          resulting from the use of the Application.
          <br />
          3.2. The developer of the Application disclaims any responsibility for
          the consequences of actions taken based on the information provided by
          the Application.
          <br />
          <br />

          <strong>4. No Warranty</strong>
          <br />
          4.1. The Application is provided "as is" under GPLv3 without warranty
          of accuracy, reliability, or suitability for a particular purpose.
          <br />
          4.2. The developer of the Application makes no guarantees regarding
          the results obtained from its use and cannot be held responsible for
          errors, inaccuracies, or omissions.
          <br />
          <br />

          <strong>5. Commitment to User Freedom and Privacy</strong>
          <br />
          5.1. As a GPLv3-licensed application, Vinyl Keeper promotes user
          freedom by allowing users to study, share, and modify the software.
          <br />
          5.2. The developer commits not to disclose user data to third parties
          for advertising or marketing purposes. No personal information will be
          sold, rented, or shared without explicit consent.
          <br />
          <br />

          <strong>6. Service Interruption</strong>
          <br />
          6.1. Users acknowledge that the Application may experience temporary
          interruptions due to technical or maintenance issues. The developer
          cannot be held responsible for such disruptions.
          <br />
          <br />

          <strong>7. Collection and Use of Personal Data (GDPR)</strong>
          <br />
          7.1. The Application collects and processes the following personal
          data: email address, username, timezone, and vinyl collection content
          (albums, artists, wishlists, and associated metadata).
          <br />
          7.2. This data is collected solely for the purpose of providing the
          Application's features and is never used for advertising or marketing
          purposes.
          <br />
          7.3. The legal basis for processing is the user's explicit consent
          given at registration, as required by Regulation (EU) 2016/679
          (GDPR).
          <br />
          7.4. Data is retained for the duration of the user's account. Upon
          account deletion, all personal data is permanently removed from our
          servers.
          <br />
          7.5. In accordance with the GDPR, users have the following rights
          regarding their personal data:
          <br />
          &nbsp;&nbsp;— <strong>Right of access:</strong> obtain a copy of the
          data held about you.
          <br />
          &nbsp;&nbsp;— <strong>Right to rectification:</strong> request
          correction of inaccurate or incomplete data.
          <br />
          &nbsp;&nbsp;— <strong>Right to erasure:</strong> request deletion of
          your account and all associated data at any time via the Settings
          page.
          <br />
          &nbsp;&nbsp;— <strong>Right to data portability:</strong> request a
          copy of your data in a structured, machine-readable format.
          <br />
          &nbsp;&nbsp;— <strong>Right to object:</strong> object to the
          processing of your data at any time.
          <br />
          7.6. To exercise any of these rights, contact:{" "}
          <Link href="mailto:vinylkeeper@quentingenet.fr">
            vinylkeeper@quentingenet.fr
          </Link>
          <br />
          7.7. If you believe your rights have not been respected, you may lodge
          a complaint with the French data protection authority (CNIL) at{" "}
          <Link
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.cnil.fr
          </Link>
          .
          <br />
          <br />

          <strong>8. Modification of Terms of Use</strong>
          <br />
          8.1. The developer reserves the right to modify the Terms at any time.
          Users are responsible for regularly reviewing updates.
          <br />
          <br />

          <strong>9. Contact</strong>
          <br />
          9.1. For any questions regarding these Terms or the processing of your
          personal data, you may contact the developer at:{" "}
          <Link href="mailto:vinylkeeper@quentingenet.fr">
            vinylkeeper@quentingenet.fr
          </Link>
          <br />
          <br />

          <strong>10. Applicable Law and Jurisdiction</strong>
          <br />
          10.1. These Terms are governed by French law. Any disputes shall fall
          under the exclusive jurisdiction of French courts.
        </Typography>

        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              color: "white",
              px: 4,
              py: 1,
            }}
          >
            Understood
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
