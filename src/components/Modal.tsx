import React, { useState } from "react";
import { IconRenderer } from "./IconRenderer";

interface ModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  type?: "alert" | "confirm" | "prompt";
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const Modal = ({
  isOpen,
  title,
  message,
  type = "alert",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  children,
}: ModalProps) => {
  if (!isOpen) return null;

  const [inputValue, setInputValue] = useState("");

  return (
    <div className="absolute inset-0 bg-black/60 z-[99999] flex items-center justify-center backdrop-blur-sm select-none">
      {/* Uses your custom color classes! */}
      <div className="bg-c-darker text-c-lighter p-6 rounded shadow-2xl border border-neutral-700 max-w-sm w-full">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          {type === "confirm" && (
            <IconRenderer
              icon="Alert"
              width={20}
              height={20}
              className="text-yellow-500"
            />
          )}
          {title}
        </h3>

        {message && <p className="text-sm mb-4 opacity-80">{message}</p>}

        {type === "prompt" && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-c-dark border border-neutral-600 rounded px-3 py-2 mb-4 text-c-lighter outline-none focus:border-blue-500"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onConfirm(inputValue)}
          />
        )}

        {children}

        <div className="flex justify-end gap-3 mt-4">
          {type !== "alert" && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-c-dark hover:bg-neutral-600 rounded transition text-c-lighter"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() =>
              onConfirm(type === "prompt" ? inputValue : undefined)
            }
            className={`px-4 py-2 rounded transition shadow text-white ${type === "confirm" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
