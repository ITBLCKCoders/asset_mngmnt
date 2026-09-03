import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (nextTheme: Theme) => void;
  toggleTheme: () => void;
  isPublicRoute: boolean;
  setIsPublicRoute: (isPublic: boolean) => void;
}

const STORAGE_KEY = "am-theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const PublicRouteContext = createContext<boolean>(false);

function applyTheme(nextTheme: Theme) {
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [isPublicRoute, setIsPublicRoute] = useState(false);

  useEffect(() => {
    // Don't apply dark theme if on a public route
    if (isPublicRoute) {
      document.documentElement.classList.remove("dark");
    } else {
      applyTheme(theme);
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, isPublicRoute]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const nextTheme = event.newValue;
      if (nextTheme === "light" || nextTheme === "dark") {
        setThemeState(nextTheme);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isPublicRoute, setIsPublicRoute }),
    [theme, setTheme, toggleTheme, isPublicRoute],
  );

  return (
    <ThemeContext.Provider value={value}>
      <PublicRouteContext.Provider value={isPublicRoute}>
        {children}
      </PublicRouteContext.Provider>
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIsPublicRoute() {
  return useContext(PublicRouteContext);
}
