import { useEffect, useRef, useState } from "react";
import { Button, Snackbar } from "@mui/material";
import { App as CapacitorApp } from "@capacitor/app";
import {
  AppUpdate,
  AppUpdateAvailability,
  FlexibleUpdateInstallStatus,
} from "@capawesome/capacitor-app-update";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { logger } from "@utils/logger";

type Step = "idle" | "available" | "downloading" | "ready";

/**
 * In the Android app, offers the update published on Google Play: a flexible update, which downloads in the
 * background while the app stays usable, then asks to restart. Asked once per launch (closing the message is
 * "later"). Renders nothing in a browser, and nothing for an app that was not installed from the Play Store.
 */
export default function NativeUpdatePrompt() {
  const [step, setStep] = useState<Step>("idle");
  // "Later" lasts until the app is started again
  const dismissed = useRef(false);

  useEffect(() => {
    if (!isCapacitorPlatform()) return;
    let active = true;

    const check = async () => {
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        if (!active) return;
        if (info.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
          setStep("ready");
        } else if (
          info.installStatus === FlexibleUpdateInstallStatus.DOWNLOADING ||
          info.installStatus === FlexibleUpdateInstallStatus.PENDING
        ) {
          setStep("downloading");
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
    };

    void check();
    const resumed = CapacitorApp.addListener("resume", () => void check());
    const state = AppUpdate.addListener(
      "onFlexibleUpdateStateChange",
      ({ installStatus }) => {
        if (installStatus === FlexibleUpdateInstallStatus.DOWNLOADED)
          setStep("ready");
        else if (
          installStatus === FlexibleUpdateInstallStatus.FAILED ||
          installStatus === FlexibleUpdateInstallStatus.CANCELED
        )
          setStep("idle");
      },
    );

    return () => {
      active = false;
      void resumed.then((handle) => handle.remove());
      void state.then((handle) => handle.remove());
    };
  }, []);

  const startUpdate = async () => {
    setStep("downloading");
    try {
      await AppUpdate.startFlexibleUpdate();
    } catch (error) {
      logger.error("Flexible update failed:", error);
      setStep("idle");
    }
  };

  const restart = async () => {
    try {
      await AppUpdate.completeFlexibleUpdate();
    } catch (error) {
      logger.error("Update installation failed:", error);
      setStep("idle");
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
        message="A new version of Vinyl Keeper is available."
        action={
          <>
            <Button color="inherit" size="small" onClick={later}>
              Later
            </Button>
            <Button
              color="primary"
              size="small"
              onClick={() => void startUpdate()}
            >
              Update
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
        message="Downloading the update, you can keep using the app."
      />
    );
  }
  if (step === "ready") {
    return (
      <Snackbar
        open
        message="Update ready."
        action={
          <Button color="primary" size="small" onClick={() => void restart()}>
            Restart
          </Button>
        }
      />
    );
  }
  return null;
}
