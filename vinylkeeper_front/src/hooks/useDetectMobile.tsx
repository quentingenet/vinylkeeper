import { RefObject, useEffect, useState } from "react";

const MOBILE_MAX_WIDTH = 767;

/**
 * Hook to detect if the screen is mobile
 * @param {RefObject<HTMLDivElement> | null} containerRef - The ref object for the container element
 * @returns {boolean} - Whether the screen is mobile or not
 */
const useDetectMobile = (
  containerRef: RefObject<HTMLDivElement> | null = null
) => {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_MAX_WIDTH : false
  );

  useEffect(() => {
    const detectSize = () => {
      if (typeof window !== "undefined") {
        const mobile = window.innerWidth < MOBILE_MAX_WIDTH;

        setIsMobile(mobile);
        if (containerRef?.current && !mobile)
          containerRef.current.style.transform = `translateX(0%)`;
      }
    };

    window.addEventListener("resize", detectSize);
    return () => window.removeEventListener("resize", detectSize);
  }, []);

  return { isMobile };
};

export default useDetectMobile;
