import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function PWAReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-lg border bg-card p-4 shadow-lg">
      <span className="text-sm font-medium">
        A new version is available
      </span>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Update
      </Button>
    </div>
  );
}
