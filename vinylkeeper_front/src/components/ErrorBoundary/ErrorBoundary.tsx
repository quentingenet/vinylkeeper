import { logger } from "@utils/logger";
import { Component, type ReactNode, type ErrorInfo } from "react";
import VinylSpinner from "@components/UI/VinylSpinner";
import { colors } from "@styles/colors";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface FallbackProps {
  error: Error | null;
  onReset: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: colors.raised,
    color: colors.textLight,
    textAlign: "center",
    padding: "2rem",
    gap: "1.8rem",
  },
  title: {
    fontSize: "2.2rem",
    fontFamily: "RockSalt, Oswald, sans-serif",
    color: colors.gold,
    margin: 0,
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: "1.05rem",
    fontFamily: "Oswald-Regular, Oswald, sans-serif",
    fontWeight: 300,
    color: colors.textSecondary,
    margin: 0,
    maxWidth: 440,
    lineHeight: 1.7,
  },
  errorCode: {
    fontFamily: "Oswald-Light, Oswald, monospace",
    fontSize: "0.8rem",
    color: colors.grey600,
    backgroundColor: colors.paper,
    padding: "0.3rem 0.9rem",
    borderRadius: "4px",
    letterSpacing: "0.04em",
    maxWidth: 480,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.8rem",
  },
  button: {
    padding: "0.65rem 2rem",
    backgroundColor: "transparent",
    color: colors.gold,
    border: `1px solid ${colors.gold}`,
    borderRadius: "6px",
    fontFamily: "Oswald-Medium, Oswald, sans-serif",
    fontSize: "1rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  link: {
    fontFamily: "Oswald-Regular, Oswald, sans-serif",
    fontSize: "0.9rem",
    color: colors.grey600,
    cursor: "pointer",
    background: "none",
    border: "none",
    textDecoration: "underline",
    letterSpacing: "0.04em",
  },
};

function ErrorFallback({ error, onReset }: FallbackProps) {
  return (
    <div style={styles.container}>
      <VinylSpinner size={80} />
      <p style={styles.title}>Something went wrong</p>
      <p style={styles.subtitle}>
        VinylKeeper hit an unexpected error.
        <br />
        Try again or go back to the home page.
      </p>
      {import.meta.env.DEV && error?.message && (
        <span style={styles.errorCode}>{error.message}</span>
      )}
      <div style={styles.actions}>
        <button
          style={styles.button}
          onClick={onReset}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.backgroundColor = colors.gold;
            btn.style.color = colors.deep;
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.backgroundColor = "transparent";
            btn.style.color = colors.gold;
          }}
        >
          Try again
        </button>
        <button
          style={styles.link}
          onClick={() => { window.location.href = "/"; }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = colors.textSecondary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = colors.grey600; }}
        >
          Go to home page
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
