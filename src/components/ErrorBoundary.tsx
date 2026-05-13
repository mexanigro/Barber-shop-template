import React from "react";
import { localeConfig } from "../config/locale";

interface State {
  hasError: boolean;
}

const messages = {
  he: {
    title: "משהו השתבש",
    body: "הדף נתקל בבעיה. נסו לרענן ולהמשיך.",
    reload: "רענון הדף",
  },
  en: {
    title: "Something went wrong",
    body: "The page ran into an issue. Try refreshing to continue.",
    reload: "Refresh page",
  },
} as const;

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const lang = localeConfig.lang === "he" ? "he" : "en";
    const t = messages[lang];

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "Inter, system-ui, sans-serif",
          background: "var(--color-bg, #09090b)",
          color: "var(--color-text, #fafafa)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: 0.4,
              marginBottom: 16,
            }}
          >
            Error
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            {t.title}
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6, marginBottom: 28 }}>
            {t.body}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-accent, #d97706)",
              color: "#fafafa",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            {t.reload}
          </button>
        </div>
      </main>
    );
  }
}
