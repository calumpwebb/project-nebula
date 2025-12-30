import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { RouterContext } from "../router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const startDrag = () => {
    getCurrentWindow().startDragging();
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Draggable Title Bar */}
      <div
        onMouseDown={startDrag}
        className="h-9 flex-shrink-0 select-none cursor-default"
      >
        <div className="w-[70px] h-full pointer-events-none" />
      </div>

      {/* Route Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
