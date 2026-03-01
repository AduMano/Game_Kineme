import React, { useState, useEffect, useRef } from "react";
import {
  useWindowStore,
  type WindowNode,
} from "../../../pages/modules/stores/useWindowStore";
import { useResourcesStore } from "../../../pages/modules/stores/useResourcesStore";
import {
  saveFileToDB,
  loadFileFromDB,
} from "../../../pages/modules/stores/utilities/indexedDB";
import ContextMenu from "../../ContextMenu";
import type { ContextMenuItem } from "../../../types/ContextMenuTypes";
import { IconRenderer } from "../../IconRenderer";
import Modal from "../../Modal";

interface EditorProps {
  windowData: WindowNode;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

const SoundEditor = ({ windowData }: EditorProps) => {
  const { requestClose, registerInterceptors, updateWindowTitle } =
    useWindowStore();
  const { updateItemData, renameItem } = useResourcesStore();

  const fileNode = useResourcesStore((state) => {
    let found = null;
    const search = (items: any[]) => {
      for (const item of items) {
        if (item.id === windowData.id) found = item;
        if (item.subDirectory) search(item.subDirectory);
      }
    };
    search(state.resources);
    return found;
  });

  const savedData = (fileNode as any)?.data;

  // --- Local State ---
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const confirmPromiseResolve = useRef<((value: boolean) => void) | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Audio State ---
  const [name, setName] = useState(windowData.title);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // --- Playback Properties ---
  const [props, setProps] = useState({
    volume: savedData?.soundProps?.volume ?? 1.0,
    pitch: savedData?.soundProps?.pitch ?? 1.0, // Maps to playbackRate in HTMLAudio
    loop: savedData?.soundProps?.loop ?? false,
    reverse: savedData?.soundProps?.reverse ?? false, // Engine runtime feature
  });

  // --- 1. Load Data on Mount ---
  useEffect(() => {
    const loadData = async () => {
      if (savedData?.hasAudio) {
        const blob = await loadFileFromDB(windowData.id);
        if (blob) {
          setAudioBlob(blob);
          setAudioSrc(URL.createObjectURL(blob));
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [windowData.id, savedData]);

  // --- 2. Safe Close Interceptor ---
  useEffect(() => {
    registerInterceptors(windowData.id, {
      onClose: () => {
        if (audioRef.current) audioRef.current.pause(); // Stop audio when closing!
        if (!hasChanges) return true;
        setShowConfirmClose(true);
        return new Promise<boolean>(
          (resolve) => (confirmPromiseResolve.current = resolve),
        );
      },
    });
  }, [hasChanges, windowData.id, registerInterceptors]);

  // --- 3. Audio Player Sync ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = props.volume;
      audioRef.current.playbackRate = props.pitch;
      audioRef.current.loop = props.loop;
    }
  }, [props, audioSrc]);

  // --- 4. Save Logic ---
  const handleSave = async () => {
    if (audioBlob) {
      await saveFileToDB(windowData.id, audioBlob); // Save heavy binary to IndexedDB
    }

    // Save lightweight properties to Zustand
    updateItemData(windowData.id, { soundProps: props, hasAudio: !!audioBlob });

    if (name !== windowData.title && windowData.data) {
      const isRenamed = renameItem({
        id: windowData.id,
        directory: windowData.data.fromDirectory,
        level: windowData.data.level,
        name,
      });
      if (isRenamed) updateWindowTitle(windowData.id, name);
      else setName(windowData.title);
    }

    setHasChanges(false);
  };

  const handlePropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setProps((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }));
    setHasChanges(true);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setAudioSrc(URL.createObjectURL(file));
      setIsPlaying(false);
      setCurrentTime(0);
      setHasChanges(true);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  if (isLoading)
    return (
      <div className="w-full h-full flex items-center justify-center bg-c-dark text-c-lighter">
        Loading Audio...
      </div>
    );

  return (
    <div className="flex flex-col w-full h-full bg-c-light text-black text-sm select-none relative">
      <Modal
        isOpen={showConfirmClose}
        type="confirm"
        title="Unsaved Changes"
        message="You have unsaved changes. If you close now, they will be lost."
        confirmText="Discard Changes"
        onCancel={() => {
          setShowConfirmClose(false);
          confirmPromiseResolve.current?.(false);
        }}
        onConfirm={() => {
          setShowConfirmClose(false);
          confirmPromiseResolve.current?.(true);
        }}
      />

      <input
        type="file"
        accept="audio/mp3, audio/wav, audio/ogg"
        ref={fileInputRef}
        className="hidden"
        onChange={handleAudioUpload}
      />

      {/* Hidden Audio Element for Playback */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => {
            if (!props.loop) setIsPlaying(false);
          }}
        />
      )}

      {/* TOP MENU */}
      <div className="flex items-center bg-c-lighter border-b border-c-darker px-2 py-1 gap-2 relative z-10 shrink-0 shadow-sm">
        <button
          onClick={(e) =>
            setMenuPos({
              x: e.currentTarget.getBoundingClientRect().left,
              y: e.currentTarget.getBoundingClientRect().bottom,
              items: [
                {
                  label: "Save",
                  onClick: handleSave,
                  icon: <IconRenderer icon="Save" width={16} height={16} />,
                },
                { label: "Close", onClick: () => requestClose(windowData.id) },
              ],
            })
          }
          className="px-2 py-1 hover:bg-c-dark hover:text-c-lighter rounded cursor-pointer transition"
        >
          File
        </button>

        <button
          onClick={(e) =>
            setMenuPos({
              x: e.currentTarget.getBoundingClientRect().left,
              y: e.currentTarget.getBoundingClientRect().bottom,
              items: [
                {
                  label: "Import Audio File",
                  onClick: () => fileInputRef.current?.click(),
                  icon: <IconRenderer icon="Script" width={16} height={16} />,
                },
                {
                  label: "Clear Audio",
                  onClick: () => {
                    setAudioSrc(null);
                    setAudioBlob(null);
                    setIsPlaying(false);
                    setHasChanges(true);
                  },
                },
              ],
            })
          }
          className="px-2 py-1 hover:bg-c-dark hover:text-c-lighter rounded cursor-pointer transition"
        >
          Audio
        </button>

        {hasChanges && (
          <span className="ml-auto text-xs text-red-600 font-semibold italic">
            * Unsaved changes
          </span>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT PANEL: PROPERTIES CARDS */}
        <div className="w-72 bg-neutral-200 border-r border-c-darker flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-10 p-3 gap-3">
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-3">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2 border-b pb-1">
              <IconRenderer icon="Script" width={14} height={14} /> Sound
              Settings
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Track Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasChanges(true);
                }}
                className="border border-neutral-300 bg-neutral-50 px-2 py-1.5 rounded outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-3">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2 border-b pb-1">
              Playback Properties
            </h3>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Default Volume
                </label>
                <span className="text-[10px] text-neutral-500">
                  {(props.volume * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                name="volume"
                min="0"
                max="1"
                step="0.01"
                value={props.volume}
                onChange={handlePropChange}
                className="cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Pitch / Speed
                </label>
                <span className="text-[10px] text-neutral-500">
                  {props.pitch.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                name="pitch"
                min="0.1"
                max="3"
                step="0.1"
                value={props.pitch}
                onChange={handlePropChange}
                className="cursor-pointer"
              />
            </div>

            <hr className="my-1 border-neutral-200" />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`loop-${windowData.id}`}
                name="loop"
                checked={props.loop}
                onChange={handlePropChange}
                className="cursor-pointer"
              />
              <label
                htmlFor={`loop-${windowData.id}`}
                className="text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Loop Seamlessly
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`reverse-${windowData.id}`}
                name="reverse"
                checked={props.reverse}
                onChange={handlePropChange}
                className="cursor-pointer"
              />
              <label
                htmlFor={`reverse-${windowData.id}`}
                className="text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Play in Reverse (Engine Runtime)
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: CUSTOM AUDIO PLAYER */}
        <div className="flex-1 bg-c-dark flex items-center justify-center p-8 relative overflow-hidden bg-checkerboard">
          {audioSrc ? (
            <div className="w-full max-w-xl bg-[#2a2a2a] rounded-xl border border-neutral-600 shadow-2xl p-6 flex flex-col gap-6 relative z-10">
              {/* Animated Visualizer Fakeout */}
              <div className="h-24 bg-[#1e1e1e] rounded border border-neutral-700 flex items-end justify-center gap-1 p-2 overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 bg-blue-500 rounded-t-sm transition-all duration-100 ease-in-out"
                    style={{
                      height: isPlaying
                        ? `${Math.max(10, Math.random() * 100)}%`
                        : "10%",
                      opacity: isPlaying ? 0.8 : 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Timeline Scrubber */}
              <div className="flex flex-col gap-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleTimeSeek}
                  className="w-full cursor-pointer accent-blue-500 h-2 bg-neutral-600 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-xs font-mono text-neutral-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() =>
                    handleTimeSeek({ target: { value: 0 } } as any)
                  }
                  className="text-neutral-400 hover:text-white transition"
                  title="Restart"
                >
                  <IconRenderer
                    icon="ChevronDown"
                    width={24}
                    height={24}
                    className="rotate-90"
                  />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg transition transform hover:scale-105"
                >
                  {isPlaying ? (
                    <div className="w-6 h-6 bg-white rounded-sm" /> // Pause square
                  ) : (
                    <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-2" /> // Play triangle
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-c-lighter flex flex-col items-center gap-2 relative z-10 bg-c-dark/80 p-6 rounded-xl border border-neutral-600">
              <IconRenderer
                icon="Script"
                width={48}
                height={48}
                className="text-neutral-500 mb-2"
              />
              <p className="font-semibold text-lg">No Audio Track Loaded</p>
              <p className="text-neutral-400 text-xs mb-4">
                Supported formats: MP3, WAV, OGG
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition shadow"
              >
                Import Audio File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="bg-c-lighter border-t border-c-darker px-4 py-2 flex justify-end gap-2 shrink-0 z-10">
        <button
          onClick={() => requestClose(windowData.id)}
          className="px-4 py-1.5 border border-c-darker rounded hover:bg-c-dark hover:text-c-lighter transition"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          className={`px-4 py-1.5 rounded transition shadow ${hasChanges ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-neutral-400 text-neutral-200 cursor-not-allowed"}`}
          disabled={!hasChanges}
        >
          Save Sound
        </button>
      </div>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={menuPos.items}
          onClose={() => setMenuPos(null)}
        />
      )}
    </div>
  );
};

export default SoundEditor;
