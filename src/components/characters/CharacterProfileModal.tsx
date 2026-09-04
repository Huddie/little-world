import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { UniverseCharacter } from "../../types/client";
import { Artwork } from "../ui/Artwork";

interface CharacterProfileModalProps {
  character: UniverseCharacter;
  displayName?: string;
  role?: "MAIN" | "SUPPORTING";
  onClose: () => void;
}

export function CharacterProfileModal({ character, displayName, onClose, role }: CharacterProfileModalProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const publicImages = character.profileImages.slice(0, 3);
  const activeImage = publicImages[imageIndex] ?? character.portraitUrl;
  const storyName = displayName && displayName !== character.name ? displayName : null;

  function showImage(nextIndex: number) {
    setImageIndex((nextIndex + publicImages.length) % publicImages.length);
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-moss-900/40 p-4" onMouseDown={onClose} role="dialog">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white shadow-2xl dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
        <div className="relative">
          <Artwork
            className="aspect-[4/3] w-full rounded-t-[2rem]"
            label="Character portraits are being prepared"
            pendingLabel="Building world"
            src={activeImage}
          />
          <button
            aria-label="Close character profile"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-moss-900 shadow-sm"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>

          {publicImages.length > 1 ? (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
              <button aria-label="Previous profile image" className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-moss-900 shadow-sm" onClick={() => showImage(imageIndex - 1)} type="button">
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1.5 rounded-full bg-white/90 px-3 py-2 shadow-sm">
                {publicImages.map((image, index) => (
                  <button
                    aria-label={`Show profile image ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${index === imageIndex ? "w-6 bg-moss-700" : "w-2 bg-moss-300"}`}
                    key={image}
                    onClick={() => setImageIndex(index)}
                    type="button"
                  />
                ))}
              </div>
              <button aria-label="Next profile image" className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-moss-900 shadow-sm" onClick={() => showImage(imageIndex + 1)} type="button">
                <ChevronRight size={18} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-moss-900 dark:text-white">{storyName ?? character.name}</h2>
              <span className="rounded-full bg-moss-100 px-2.5 py-1 text-xs font-semibold text-moss-900 dark:bg-moss-300/18 dark:text-moss-100">{character.species}</span>
              {role === "MAIN" ? <span className="rounded-full bg-honey-100 px-2.5 py-1 text-xs font-semibold text-moss-900 dark:bg-honey-300/20 dark:text-honey-100">Main character</span> : null}
            </div>
            {storyName ? <p className="mt-1 text-sm font-semibold text-moss-700 dark:text-slate-300">Based on {character.name}</p> : null}
            <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">{character.description}</p>
          </div>

          <div className="rounded-lg bg-moon-50 p-4 dark:bg-white/8">
            <p className="text-xs font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300">Personality</p>
            <p className="mt-2 text-sm leading-6 text-moss-900 dark:text-slate-100">{character.personality}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
