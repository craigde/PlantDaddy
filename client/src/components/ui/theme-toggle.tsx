import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      {showLabel && (
        <>
          <SunIcon className="h-4 w-4 text-yellow-500" />
          <Label htmlFor="dark-mode" className="text-sm">Dark Mode</Label>
        </>
      )}
      <Switch
        id="dark-mode"
        checked={isDarkMode}
        onCheckedChange={toggleDarkMode}
      />
      {showLabel && <MoonIcon className="h-4 w-4 text-slate-500" />}
    </div>
  );
}

export function ThemeToggleButton() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDarkMode}
      className="w-9 px-0"
    >
      {isDarkMode ? (
        <SunIcon className="h-5 w-5 text-yellow-400" />
      ) : (
        <MoonIcon className="h-5 w-5 text-slate-500" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}