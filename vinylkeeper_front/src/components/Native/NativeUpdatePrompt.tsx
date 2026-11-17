import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Snackbar } from "@mui/material";
import { App as CapacitorApp } from "@capacitor/app";
import {
  AppUpdate,
  AppUpdateAvailability,
  AppUpdateResultCode,
  FlexibleUpdateInstallStatus,
} from "@capawesome/capacitor-app-update";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { logger } from "@utils/logger";
import { useTranslation } from "react-i18next";

type Step = "idle" | "available" | "downloading" | "ready" | "installing";

// While downloading, Google Play only pushes progress to the session that started the update: polling also covers
// an app restarted mid-download
const PROGRESS_POLL_MS = 4000;

const IN_PROGRESS_STATUSES = [
  FlexibleUpdateInstallStatus.PENDING,
  FlexibleUpdateInstallStatus.DOWNLOADING,
  FlexibleUpdateInstallStatus.INSTALLING,
];

function UpdateMessage({ text }: { text: string }) {
  return (
    <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <CircularProgress size={18} color="inherit" aria-hidden />
      {text}
    </Box>
  );
}

/**
 * In the Android app, offers the update published on Google Play: a flexible update, which downloads in the
 * background while the app stays usable, then asks to restart. Asked once per launch (closing the message is
 * "later"). Renders nothing in a browser, and nothing for an app that was not installed from the Play Store.
 */
export default function NativeUpdatePrompt() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  // "Later" lasts until the app is started again
  const dismissed = useRef(false);
  // Set once the update is accepted: Google Play can still report "update available" for a few seconds after its
  // dialog closes, which must not bring the offer back
  const started = useRef(false);

  const check = useCallback(async () => {
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      const status = info.installStatus;
      if (status === FlexibleUpdateInstallStatus.DOWNLOADED) {
        started.current = true;
        setStep("ready");
      } else if (
        (status !== undefined && IN_PROGRESS_STATUSES.includes(status)) ||
        info.updateAvailability === AppUpdateAvailability.UPDATE_IN_PROGRESS
      ) {
        started.current = true;
        setStep((current) => (current === "installing" ? current : "downloading"));
      } else if (started.current) {
        // Accepted but not reported yet: keep showing the progress
      } else if (
        !dismissed.current &&
        info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE &&
        info.flexibleUpdateAllowed
      ) {
        setStep("available");
      }
    } catch (error) {
      // Not installed from the Play Store (APK of a test, for instance): no update to offer
      logger.warn("App update check skipped:", error);
    }
  }, []);

  useEffect(() => {
    if (!isCapacitorPlatform()) return;
    let active = true;
    const safeCheck = () => {
      if (active) void check();
    };

    safeCheck();
    const resumed = CapacitorApp.addListener("resume", safeCheck);
    const state = AppUpdate.addListener(
      "onFlexibleUpdateStateChange",
      ({ installStatus, bytesDownloaded, totalBytesToDownload }) => {
        if (!active) return;
        if (installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
          setStep("ready");
        } else if (
          installStatus === FlexibleUpdateInstallStatus.FAILED ||
          installStatus === FlexibleUpdateInstallStatus.CANCELED
        ) {
          started.current = false;
          setStep("idle");
        } else if (installStatus === FlexibleUpdateInstallStatus.DOWNLOADING) {
          setStep("downloading");
          if (bytesDownloaded !== undefined && totalBytesToDownload) {
            setProgress(Math.floor((bytesDownloaded / totalBytesToDownload) * 100));
          }
        }
      },
    );

    return () => {
      active = false;
      void resumed.then((handle) => handle.remove());
      void state.then((handle) => handle.remove());
    };
  }, [check]);

  useEffect(() => {
    if (step !== "downloading") return;
    const timer = setInterval(() => void check(), PROGRESS_POLL_MS);
    return () => clearInterval(timer);
  }, [step, check]);

  const startUpdate = async () => {
    started.current = true;
    setProgress(null);
    setStep("downloading");
    try {
      const result = await AppUpdate.startFlexibleUpdate();
      if (result.code !== AppUpdateResultCode.OK) {
        // Closed or refused in the Google Play dialog: same as "later"
        started.current = false;
        dismissed.current = true;
        setStep("idle");
      }
    } catch (error) {
      logger.error("Flexible update failed:", error);
      started.current = false;
      setStep("idle");
    }
  };

  const restart = async () => {
    setStep("installing");
    try {
      await AppUpdate.completeFlexibleUpdate();
    } catch (error) {
      logger.error("Update installation failed:", error);
      setStep("ready");
    }
  };

  const later = () => {
    dismissed.current = true;
    setStep("idle");
  };

  if (step === "available") {
    return (
      <Snackbar
        open
        message={t("update.available")}
        action={
          <>
            <Button color="inherit" size="small" onClick={later}>
              {t("update.later")}
            </Button>
            <Button
              color="primary"
              size="small"
              onClick={() => void startUpdate()}
            >
              {t("update.update")}
            </Button>
          </>
        }
      />
    );
  }
  if (step === "downloading") {

    return (
      <Snackbar
        open
        message={
          <UpdateMessage
            text={progress !== null ? t("update.progressPercent", { percent: progress }) : t("update.progress")}
          />
        }
      />
    );
  }
  if (step === "ready") {
    return (
      <Snackbar
        open
        message={t("update.ready")}
        action={
          <Button color="primary" size="small" onClick={() => void restart()}>
            {t("update.restart")}
          </Button>
        }
      />
    );
  }
  if (step === "installing") {
    return (
      <Snackbar
        open
        message={<UpdateMessage text={t("update.installing")} />}
      />
    );
  }
  return null;
}
