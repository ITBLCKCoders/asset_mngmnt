import { forwardRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ThemeToggleProps {
  className?: string;
}

export default forwardRef<HTMLButtonElement, ThemeToggleProps>(
  function ThemeToggle({ className }, ref) {
    const { theme, setTheme } = useTheme();
    const isDarkMode = theme === "dark";

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            type="button"
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
            aria-pressed={isDarkMode}
            className={`relative h-8 w-16 rounded-full border border-white/20 bg-white/15 backdrop-blur-2xl shadow-xl ring-1 ring-white/10 hover:shadow-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className ?? ""}`}
          >
            <span
              className={`absolute top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isDarkMode
                  ? "left-9 rotate-12 text-slate-700"
                  : "left-1 rotate-0 text-amber-500"
              }`}
            >
              {isDarkMode ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-[100]">
          <p>Toggle theme</p>
        </TooltipContent>
      </Tooltip>
    );
  },
);
