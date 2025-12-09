import { Capacitor } from "@capacitor/core";

export const isCapacitorPlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): "web" | "ios" | "android" => {
  return Capacitor.getPlatform() as "web" | "ios" | "android";
};
