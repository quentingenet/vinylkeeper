import type { ReactNode } from "react";
import { Box, Modal, Typography, Button, Link } from "@mui/material";
import { colors } from "@styles/colors";
import { DISCOGS_DISCLAIMER } from "@utils/discogsLinks";

// The popup has a light background: its links take the color of the text around them (black),
// underlined, whatever the theme of the page opening it (the gold primary is unreadable on it)
const readableLink = { color: "inherit", underline: "always", sx: { fontWeight: 600 } } as const;

export const TERMS_LAST_UPDATED = "30/10/2026";
const CONTACT_EMAIL = "vinylkeeper@quentingenet.fr";

const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link {...readableLink} href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </Link>
);

interface TermsSection {
  title: string;
  paragraphs: ReactNode[];
}

const SECTIONS: TermsSection[] = [
  {
    title: "Legal information",
    paragraphs: [
      <>
        Publisher: Quentin Genet, private individual. Contact:{" "}
        <Link {...readableLink} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
      </>,
      <>
        Hosting of the API and its database: Hostinger (<ExternalLink href="https://www.hostinger.com">hostinger.com</ExternalLink>).
        Hosting of the website: Netlify (<ExternalLink href="https://www.netlify.com">netlify.com</ExternalLink>).
      </>,
    ],
  },
  {
    title: "1. Acceptance of the Terms",
    paragraphs: [
      "1.1. Using Vinyl Keeper (the \"Application\") means accepting these Terms of Use (the \"Terms\") without reservation.",
      "1.2. You acknowledge having read these Terms and agree to comply with them.",
    ],
  },
  {
    title: "2. Use of the Application",
    paragraphs: [
      "2.1. The Application is meant for personal, non-commercial use: managing, sharing and discovering vinyl collections.",
      "2.2. You must be at least 15 years old to create an account.",
    ],
  },
  {
    title: "3. Collection value estimates",
    paragraphs: [
      "3.1. The value shown for a collection is an indicative estimate, computed from the prices Discogs suggests for the pressings you recorded. It is not an appraisal and depends on how exact your pressings and conditions are.",
      "3.2. For any decision about the value of your records (sale, insurance), consult a professional.",
    ],
  },
  {
    title: "4. Your content and what others see",
    paragraphs: [
      "4.1. You are responsible for what you add: collection names, records, Atlas spots, reports and their comments.",
      "4.2. Collections you make public, and your username, are visible to the other members. The Vinyl Atlas, its spots included, is visible to everyone, visitors without an account too.",
      "4.3. The administrator may correct or remove an Atlas spot that is wrong, closed or inappropriate.",
    ],
  },
  {
    title: "5. No warranty",
    paragraphs: [
      "5.1. The Application is provided \"as is\" under GPLv3, without warranty of accuracy, reliability or fitness for a particular purpose.",
      "5.2. The developer cannot be held responsible for errors, inaccuracies or omissions, nor for decisions taken on the basis of the Application.",
    ],
  },
  {
    title: "6. Service interruption",
    paragraphs: [
      "6.1. The Application may be temporarily unavailable for technical or maintenance reasons. The developer cannot be held responsible for such interruptions.",
    ],
  },
  {
    title: "7. Personal data (GDPR)",
    paragraphs: [
      "7.1. Data processed: your account (email address, username, password stored hashed, timezone, preferred currency); your activity (dates of your last login and visit, number of logins); your content (collections, records and copies with their condition, wishlist, likes, Atlas spots you suggest, reports and their comments, contact messages); and, if you connect it, your Discogs account (Discogs username and access tokens, stored encrypted) with the history of your imports.",
      "7.2. This data is only used to provide the features of the Application. It is never used for advertising or marketing, and never sold or rented.",
      "7.3. Legal basis: the performance of the service you sign up for (Article 6.1.b of Regulation (EU) 2016/679, the GDPR). The technical logs that keep the service secure rely on its legitimate interest (Article 6.1.f).",
      "7.4. Recipients, only what each one needs: Hostinger hosts the API and the database; Netlify hosts the website and sees the IP address of visitors; OVH sends the emails; Discogs answers the searches and, when you connect your account, gives access to your collection and wantlist; OpenStreetMap serves the map tiles your browser loads; Nominatim locates the Atlas spots. The exchange rates of the collection value (European Central Bank, through Frankfurter) involve no personal data.",
      "7.5. Retention: your data is kept while your account exists. When you delete it, your account, collections, wishlist, likes and Discogs connection are deleted; the Atlas spots you suggested and your reports stay, without your name. Daily backups of the database keep the data until they are replaced, and the technical logs, which contain usernames, are kept up to 4 weeks.",
      "7.6. Cookies: only cookies strictly necessary to the service (session and security). No tracking or advertising cookie. Your browser's local storage keeps a few preferences, such as the tutorial already seen.",
      "7.7. Your rights under the GDPR: access, rectification, erasure (delete your account from the Settings page), portability (export your collections and wishlist as CSV or ODS from the Application, or ask for your data) and objection. You can disconnect your Discogs account at any time from the Discogs import window, and also remove Vinyl Keeper from the applications of your Discogs account.",
      <>
        7.8. To exercise these rights: <Link {...readableLink} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
        If you believe your rights are not respected, you may lodge a complaint with the French data protection
        authority (CNIL) at <ExternalLink href="https://www.cnil.fr">www.cnil.fr</ExternalLink>.
      </>,
    ],
  },
  {
    title: "8. Discogs attribution and disclaimer",
    paragraphs: [
      "8.1. Vinyl Keeper uses the Discogs API to search records, complete their details, estimate collection values and import Discogs collections.",
      `8.2. ${DISCOGS_DISCLAIMER}`,
      <>
        8.3. Data provided by <ExternalLink href="https://www.discogs.com">Discogs</ExternalLink>. All rights to
        Discogs trademarks and content remain with their respective owners.
      </>,
    ],
  },
  {
    title: "9. Changes to the Terms",
    paragraphs: ["9.1. The developer may change these Terms at any time. The date above shows the latest version."],
  },
  {
    title: "10. Applicable law and jurisdiction",
    paragraphs: ["10.1. These Terms are governed by French law. Any dispute falls under the exclusive jurisdiction of French courts."],
  },
];

interface ModalTermsVinylKeeperProps {
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
}

export default function ModalTermsVinylKeeper(props: ModalTermsVinylKeeperProps) {
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
    bgcolor: colors.offWhite,
    border: `2px solid ${colors.black}`,
    boxShadow: 24,
    opacity: 0.8,
    p: 2,
  };

  return (
    <Modal
      open={openTermsModal}
      onClose={handleClose}
      aria-labelledby="terms-modal-title"
      aria-describedby="terms-modal-description"
      disableAutoFocus
      disableEnforceFocus
    >
      <Box sx={style}>
        <Typography id="terms-modal-title" variant="h6" component="h2" sx={{ color: "black", textAlign: "center" }}>
          Vinyl Keeper Terms of Use
        </Typography>

        <Box id="terms-modal-description" sx={{ mt: 2, color: "black" }}>
          <Typography sx={{ color: "black", fontWeight: 700 }}>
            Vinyl Keeper is a free and open-source application licensed under GPLv3, developed by Quentin Genet, to
            manage, share and discover vinyl collections while promoting the freedom to share and modify the software.
          </Typography>

          <Typography sx={{ mt: 2, textAlign: "center", color: "black" }}>
            Available at <ExternalLink href="https://vinylkeeper.org">vinylkeeper.org</ExternalLink>
            <br />
            <ExternalLink href="https://github.com/quentingenet/vinylkeeper">Source code (GitHub)</ExternalLink>
          </Typography>
          <Typography sx={{ mt: 1, textAlign: "center", color: "black", fontStyle: "italic" }}>
            Last updated: {TERMS_LAST_UPDATED}
          </Typography>

          {SECTIONS.map((section) => (
            <Box key={section.title} component="section" sx={{ mt: 2.5 }}>
              <Typography component="h3" sx={{ color: "black", fontWeight: 700 }}>
                {section.title}
              </Typography>
              {section.paragraphs.map((paragraph, index) => (
                <Typography key={index} variant="body2" sx={{ color: "black", mt: 0.75 }}>
                  {paragraph}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Button variant="contained" onClick={handleClose} sx={{ color: "white", px: 4, py: 1 }}>
            Understood
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
