import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "../../../hooks/useLanguage";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function MobileBottomSheet({ open, onClose, title, children }: Props) {
  const { t } = useLanguage();
  const [translateY, setTranslateY] = useState(100); // percent
  const startY = useRef(0);
  const currentTranslate = useRef(100);
  const isDragging = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTranslateY(0);
      currentTranslate.current = 0;
      document.body.style.overflow = "hidden";
    } else {
      setTranslateY(100);
      currentTranslate.current = 100;
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Only allow drag from the handle area
    if (!target.closest(".bottom-sheet__handle")) return;
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const deltaY = e.touches[0].clientY - startY.current;
    const percent = Math.max(0, (deltaY / window.innerHeight) * 100);
    setTranslateY(percent);
    currentTranslate.current = percent;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    // Snap: if dragged more than 30% of viewport, close
    if (currentTranslate.current > 30) {
      onClose();
    } else {
      setTranslateY(0);
      currentTranslate.current = 0;
    }
  }, [onClose]);

  if (!open && translateY >= 100) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        className="bottom-sheet"
        style={{ transform: `translateY(${translateY}%)` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bottom-sheet__handle">
          <div className="bottom-sheet__handle-bar" />
        </div>
        {title && (
          <div className="bottom-sheet__header">
            <h3>{title}</h3>
            <button type="button" onClick={onClose} aria-label={t("sAriaClose")}>
              <X size={20} />
            </button>
          </div>
        )}
        <div className="bottom-sheet__content">{children}</div>
      </div>
    </div>
  );
}
