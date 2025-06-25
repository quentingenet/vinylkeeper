import vinylKeeperLogo from "@assets/vinylKeeper.svg";

interface VinylSpinnerProps {
  size?: number;
}

export default function VinylSpinner({ size = 48 }: VinylSpinnerProps) {
  return (
    <div
      style={{
        display: "inline-block",
        animation: "fade-in-vinyl 0.5s ease, spin-vinyl 1.2s linear infinite",
        width: size,
        height: size,
        opacity: 1,
      }}
    >
      <img
        src={vinylKeeperLogo}
        alt="Loading..."
        style={{
          width: "100%",
          height: "100%",
          filter: `drop-shadow(0 0 0 #000) drop-shadow(0 0 0 #000)`,
        }}
      />
      <style>{`
        @keyframes spin-vinyl {
          100% { transform: rotate(360deg); }
        }
        @keyframes fade-in-vinyl {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
