export const API_VK_URL = import.meta.env.VITE_API_VK_URL;

export const getTimezone = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone;
};
