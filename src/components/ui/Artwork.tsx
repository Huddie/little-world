import { ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type ArtworkProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  fit?: "contain" | "cover";
  label?: string;
  pendingLabel?: string;
};

const loadedImages = new Set<string>();
const fitClassName = {
  contain: "object-contain",
  cover: "object-cover",
};

export function Artwork({
  alt = "",
  className = "aspect-[4/3] w-full",
  fit = "contain",
  label = "Artwork is being prepared",
  pendingLabel = "Generating illustration",
  src,
}: ArtworkProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(() => Boolean(src && loadedImages.has(src)));
  const unavailable = !src || failed;

  useEffect(() => {
    setFailed(false);
    if (!src) {
      setLoaded(false);
      return undefined;
    }
    if (loadedImages.has(src)) {
      setLoaded(true);
      return undefined;
    }

    let cancelled = false;
    setLoaded(false);
    const image = new Image();
    image.onload = () => {
      loadedImages.add(src);
      if (!cancelled) setLoaded(true);
    };
    image.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (unavailable) {
    return (
      <div className={`${className} grid place-items-center rounded-md border border-moon-200 bg-moon-50 text-center dark:border-white/10 dark:bg-white/8`}>
        <div className="p-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-moss-700 shadow-sm dark:bg-slate-900 dark:text-moss-200">
            {failed ? <ImageIcon size={22} /> : <Sparkles className="animate-pulse" size={22} />}
          </div>
          <p className="mt-3 text-sm font-bold text-moss-900 dark:text-slate-100">
            {failed ? "Image could not load" : label}
          </p>
          <p className="mt-1 text-xs font-semibold text-moss-700 dark:text-slate-300">
            {failed ? "Please retry or contact support if it continues." : pendingLabel}
          </p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className={`${className} grid place-items-center rounded-md border border-moon-200 bg-moon-50 text-center dark:border-white/10 dark:bg-white/8`}>
        <div className="p-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-moss-700 shadow-sm dark:bg-slate-900 dark:text-moss-200">
            <Sparkles className="animate-pulse" size={22} />
          </div>
          <p className="mt-3 text-sm font-bold text-moss-900 dark:text-slate-100">Loading image</p>
          <p className="mt-1 text-xs font-semibold text-moss-700 dark:text-slate-300">Preparing artwork</p>
        </div>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={`${className} bg-moon-50 ${fitClassName[fit]} dark:bg-slate-900`}
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
