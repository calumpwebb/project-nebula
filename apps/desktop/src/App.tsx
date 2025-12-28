import { getCurrentWindow } from "@tauri-apps/api/window";
import { Rocket } from "lucide-react";

function App() {
  const startDrag = () => {
    getCurrentWindow().startDragging();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Title Bar */}
      <div
        onMouseDown={startDrag}
        className="h-9 flex items-center border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0 select-none"
      >
        {/* Traffic light spacer (macOS) */}
        <div className="w-[70px] flex-shrink-0 pointer-events-none" />

        {/* Center: App name */}
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-muted-foreground">Project Nebula</span>
        </div>

        {/* Right spacer for symmetry */}
        <div className="w-[70px] flex-shrink-0" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Rocket className="w-16 h-16 text-primary opacity-50 mb-4" />
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Project Nebula
        </h1>
        <p className="text-muted-foreground text-sm">
          Developer HUD for AI-assisted coding
        </p>
      </div>
    </div>
  );
}

export default App;
