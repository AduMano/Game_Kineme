import type { JSX } from "react";
import type { IIConRenderer, TIcon } from "../types/IconRendererTypes";
import {
  ChevronDownIcon, ChevronRightIcon, CodeBracketSquareIcon, PhotoIcon, DocumentIcon,
  DocumentCheckIcon, DocumentPlusIcon, FolderIcon, FolderOpenIcon, HomeIcon, PlayIcon,
  SpeakerWaveIcon, CubeIcon,
  TrashIcon,
  PencilSquareIcon,
  DocumentMagnifyingGlassIcon
} from "@heroicons/react/24/outline";

export const IconRenderer = ({
  icon,
  width = 24,
  height = 24,

  className = ""
}: IIConRenderer) => {
  const Icons: Record<TIcon, JSX.Element> = {
    Folder: <FolderIcon width={width} height={height} />,
    OpenFolder: <FolderOpenIcon width={width} height={height} />,
    File: <DocumentIcon width={width} height={height} />,
    Image: <PhotoIcon width={width} height={height} />,
    Sound: <SpeakerWaveIcon width={width} height={height} />,
    Object: <CubeIcon width={width} height={height} />,
    Script: <CodeBracketSquareIcon width={width} height={height} />,
    Room: <HomeIcon width={width} height={height} />,
    Save: <DocumentCheckIcon width={width} height={height} />,
    Play: <PlayIcon width={width} height={height} />,
    ChevronRight: <ChevronRightIcon width={width} height={height} />,
    ChevronDown: <ChevronDownIcon width={width} height={height} />,
    NewFile: <DocumentPlusIcon width={width} height={height} />,
    Trash: <TrashIcon width={width} height={height} />,
    Pencil: <PencilSquareIcon width={width} height={height} />,
    MagnifyingGlass: <DocumentMagnifyingGlassIcon width={width} height={height} />,
  };

  return <div className={className}>{Icons[icon]}</div>;
};
