import React, { useState, useRef } from "react";
import {
  useWindowStore,
  type WindowNode,
} from "../../pages/modules/stores/useWindowStore";

interface BaseWindowProps {
  windowData: WindowNode;
  children: React.ReactNode;
}

const BaseWindow = ({ windowData, children }: BaseWindowProps) => {
  const {
    requestClose,
    requestMinimize,
    requestMaximize,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    activeWindowId,
  } = useWindowStore();

  const windowRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeState = useRef({ startW: 0, startH: 0, startX: 0, startY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const isActive = activeWindowId === windowData.id;
  const isMaximized = windowData.isMaximized;

  // --- Dragging Logic ---
  const handleDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;

    dragOffset.current = {
      x: e.clientX - windowData.position.x,
      y: e.clientY - windowData.position.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isMaximized) return;
    updateWindowPosition(windowData.id, {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };

  const handleDragUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // --- Resizing Logic ---
  const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    resizeState.current = {
      startW: windowData.size.width,
      startH: windowData.size.height,
      startX: e.clientX,
      startY: e.clientY,
    };
    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeState.current.startX;
    const deltaY = e.clientY - resizeState.current.startY;

    const newWidth = Math.max(300, resizeState.current.startW + deltaX);
    const newHeight = Math.max(200, resizeState.current.startH + deltaY);

    updateWindowSize(windowData.id, { width: newWidth, height: newHeight });
  };

  const handleResizeUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsResizing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (windowData.isMinimized) return null;

  return (
    <div
      ref={windowRef}
      onPointerDownCapture={() => focusWindow(windowData.id)}
      style={
        isMaximized
          ? {
              top: 0,
              left: 0,
              right: 0,
              bottom: "40px",
              zIndex: windowData.zIndex,
            }
          : {
              left: windowData.position.x,
              top: windowData.position.y,
              width: windowData.size.width,
              height: windowData.size.height,
              zIndex: windowData.zIndex,
            }
      }
      className={`absolute flex flex-col bg-neutral-800 rounded-md shadow-2xl overflow-hidden border ${
        isActive ? "border-neutral-700" : "border-c-light"
      } ${isMaximized ? "rounded-none border-0" : ""}`}
    >
      {/* Top Title Bar */}
      <div
        className={`flex items-center justify-between px-3 py-1 select-none ${
          isMaximized ? "cursor-default" : "cursor-move"
        } ${isActive ? "bg-c-light text-black" : "bg-c-lighter text-black filter brightness-90"}`}
        onPointerDown={handleDragDown}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragUp}
        onDoubleClick={() => requestMaximize(windowData.id)}
      >
        <span className="text-sm font-semibold truncate pointer-events-none">
          {windowData.title}
        </span>

        <div
          className="flex gap-2 ml-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => requestMinimize(windowData.id)}
            className="w-4 h-4 rounded-full bg-yellow-500 hover:bg-yellow-400"
            title="Minimize"
          />
          <button
            onClick={() => requestMaximize(windowData.id)}
            className="w-4 h-4 rounded-full bg-green-500 hover:bg-green-400"
            title="Maximize"
          />
          <button
            onClick={() => requestClose(windowData.id)}
            className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400"
            title="Close"
          />
        </div>
      </div>

      <div className="flex-1 bg-neutral-100 relative overflow-hidden">
        {children}
      </div>

      {!isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 flex items-end justify-end p-1"
          onPointerDown={handleResizeDown}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
        >
          <div className="w-2 h-2 bg-neutral-400 rounded-tl-sm opacity-50" />
        </div>
      )}
    </div>
  );
};

export default BaseWindow;
