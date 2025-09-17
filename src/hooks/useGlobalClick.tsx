import { useEffect, type RefObject } from "react";

export function useGlobalClick(
  callback: () => void,
  excludeRef: RefObject<HTMLElement> | null = null
) {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        excludeRef?.current &&
        excludeRef.current.contains(event.target as Node)
      ) {
        return;
      }
      callback();
    };

    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [callback, excludeRef]);
}
