export const API_VK_URL = import.meta.env.VITE_API_VK_URL;
export const API_DEEZER_URL = import.meta.env.VITE_API_DEEZER_URL;
export const getTimezone = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone;
};

export const truncateText = (text: string, maxLength: number) => {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};
