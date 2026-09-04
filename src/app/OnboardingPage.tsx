import { ArrowRight, CheckCircle2, Lock, Mail, Sparkles, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import { moonlightMonthly } from "../lib/mock-data";
import { CharacterProfileModal } from "../components/characters/CharacterProfileModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, Select, Textarea, TextInput } from "../components/ui/Form";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { UniverseCharacter } from "../types/client";
import type { AgeRange } from "../types/client";

const steps = ["Account", "Child", "Personalize", "Delivery", "Ready"] as const;
const ageRangeOptions: Array<{ value: AgeRange; label: string; independentReading: boolean }> = [
  { value: "1-11 months", label: "1-11 months", independentReading: false },
  { value: "12-23 months", label: "12-23 months", independentReading: false },
  { value: "2-3", label: "Ages 2-3", independentReading: false },
  { value: "4-5", label: "Ages 4-5", independentReading: false },
  { value: "6-8", label: "Ages 6-8", independentReading: true },
  { value: "9-12", label: "Ages 9-12", independentReading: true },
];

const storyGenreOptions = ["gentle mystery", "friendship", "bedtime adventure", "silly quest", "kindness", "discovery", "cozy magic", "nature"];
const storyIngredientOptions = ["animals", "baking", "fireflies", "music", "maps", "rainy days", "tiny treasures", "gardens", "blanket forts", "stars"];

type CastMember = {
  characterId: string;
  sourceCharacterId: string;
  displayName: string;
  species: string;
  description: string;
  personality: string;
  role: "MAIN" | "SUPPORTING";
};

const ageRangeByMonth: Array<{ maxMonths: number; value: AgeRange }> = [
  { maxMonths: 11, value: "1-11 months" },
  { maxMonths: 23, value: "12-23 months" },
  { maxMonths: 47, value: "2-3" },
  { maxMonths: 71, value: "4-5" },
  { maxMonths: 107, value: "6-8" },
  { maxMonths: Number.POSITIVE_INFINITY, value: "9-12" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [selectedGenreOptions, setSelectedGenreOptions] = useState<string[]>(["gentle mystery", "friendship"]);
  const [customGenre, setCustomGenre] = useState("");
  const [selectedIngredientOptions, setSelectedIngredientOptions] = useState<string[]>(["mysteries", "baking", "fireflies"]);
  const [customIngredient, setCustomIngredient] = useState("");
  const [firstName, setFirstName] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange>("2-3");
  const [birthDate, setBirthDate] = useState("");
  const [readingLevel, setReadingLevel] = useState("early");
  const [parentNotes, setParentNotes] = useState("Likes gentle surprises and stories where nervous characters become brave.");
  const [castError, setCastError] = useState<Error | null>(null);
  const [castLoading, setCastLoading] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const progress = useMemo(() => `${Math.round(((step + 1) / steps.length) * 100)}%`, [step]);
  const currentStep = steps[step] ?? steps[0];

  useEffect(() => {
    void apiClient.getCharacterNameSuggestions().then(setNameSuggestions);
  }, []);

  useEffect(() => {
    const suggestedAgeRange = getAgeRangeFromBirthday(birthDate);
    if (suggestedAgeRange) setAgeRange(suggestedAgeRange);
  }, [birthDate]);

  useEffect(() => {
    void generateCast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageRange, selectedGenreOptions.join("|"), selectedIngredientOptions.join("|")]);

  return (
    <div className="mx-auto max-w-5xl">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-honey-300/60 bg-honey-50 px-3 py-1 text-sm font-semibold text-moss-900">
            <Sparkles size={16} />
            Your little one’s little world
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-normal text-moss-900 sm:text-5xl">Start building a little world.</h1>
            <p className="mt-4 text-lg leading-8 text-moss-700">
              Create a profile, choose a story cast, and each new adventure grows from what came before.
            </p>
          </div>
          <Card className="overflow-hidden p-5">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-moon-200 bg-white">
                <img alt="" className="h-12 w-12" src="/brand/little-world-icon.svg" />
              </div>
              <div>
                <h2 className="font-bold">{moonlightMonthly.name}</h2>
                <p className="mt-1 text-sm leading-6 text-moss-700">{moonlightMonthly.universe.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {moonlightMonthly.universe.characters.map((character) => (
                    <span className="rounded-full bg-moon-100 px-3 py-1 text-xs font-semibold text-moon-900" key={character.id}>
                      {character.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-moss-700">
              <span>{currentStep}</span>
              <span>{progress}</span>
            </div>
            <div className="h-2 rounded-full bg-moss-100">
              <div className="h-2 rounded-full bg-moss-700 transition-all" style={{ width: progress }} />
            </div>
          </div>

          {step === 0 ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-moss-50 p-5">
                <div className="flex items-start gap-3">
                  <Mail className="mt-1 text-moss-700" size={20} />
                  <div>
                    <h2 className="font-black">Parent account</h2>
                    <p className="mt-2 text-sm leading-6 text-moss-700">
                      Your parent email manages the story shelf, delivery notices, and family settings.
                    </p>
                    <a className="mt-3 inline-flex text-sm font-bold text-moon-700 hover:text-moon-900" href="/sign-in">
                      Use a different email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <Field hint="Optional. A story collection can work without a child name." label="Child first name">
                <TextInput onChange={(event) => setFirstName(event.target.value)} placeholder="Optional" value={firstName} />
              </Field>
              <Field hint="Optional. If entered, we suggest the age range automatically." label="Birthday">
                <TextInput onChange={(event) => setBirthDate(event.target.value)} type="date" value={birthDate} />
              </Field>
              <Field hint={birthDate ? "Suggested from birthday. You can adjust it if needed." : "Used to tune story length, tone, and themes."} label="Age range">
                <Select onChange={(event) => setAgeRange(event.target.value as AgeRange)} value={ageRange}>
                  {ageRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </Field>
              {supportsReadingLevel(ageRange) ? (
                <Field hint="Used when the child may read the story independently." label="Reading level">
                  <Select onChange={(event) => setReadingLevel(event.target.value)} value={readingLevel}>
                    <option value="early">Early reader</option>
                    <option value="growing">Growing reader</option>
                  </Select>
                </Field>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <Field label="Story genres">
                <TagPicker
                  customValue={customGenre}
                  datalistId="story-genre-options"
                  onAddCustom={() => {
                    addTag(customGenre, selectedGenreOptions, setSelectedGenreOptions);
                    setCustomGenre("");
                  }}
                  onCustomChange={setCustomGenre}
                  onRemove={(genre) => setSelectedGenreOptions((values) => values.filter((value) => value !== genre))}
                  options={storyGenreOptions}
                  selected={selectedGenreOptions}
                />
              </Field>
              <Field label="Favorite story ingredients">
                <TagPicker
                  customValue={customIngredient}
                  datalistId="story-ingredient-options"
                  onAddCustom={() => {
                    addTag(customIngredient, selectedIngredientOptions, setSelectedIngredientOptions);
                    setCustomIngredient("");
                  }}
                  onCustomChange={setCustomIngredient}
                  onRemove={(ingredient) => setSelectedIngredientOptions((values) => values.filter((value) => value !== ingredient))}
                  options={storyIngredientOptions}
                  selected={selectedIngredientOptions}
                />
              </Field>
              <CharacterCastPicker
                cast={cast}
                error={castError}
                loading={castLoading}
                nameSuggestions={nameSuggestions}
                onMainCharacterChange={(characterId) => setCast((members) => members.map((member) => ({ ...member, role: member.characterId === characterId ? "MAIN" : "SUPPORTING" })))}
                onPersonaChange={(characterId, field, value) => setCast((members) => members.map((member) => member.characterId === characterId ? { ...member, [field]: value } : member))}
                onRetry={() => void generateCast()}
              />
              <Field label="Parent notes">
                <Textarea onChange={(event) => setParentNotes(event.target.value)} value={parentNotes} />
              </Field>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              {moonlightMonthly.deliveryOptions.map((option) => (
                <label className="flex items-start gap-4 rounded-lg border border-moss-100 p-4" key={option.method}>
                  <input className="mt-1 h-4 w-4 accent-moss-700" defaultChecked={option.method === "EMAIL"} disabled={option.availability !== "ENABLED"} name="delivery" type="radio" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-bold">
                      {option.method === "EMAIL" ? <Mail size={16} /> : null}
                      {option.label}
                      <StatusBadge status={option.availability} />
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-moss-700">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="rounded-lg bg-moss-50 p-5">
              <CheckCircle2 className="text-moss-700" size={32} />
              <h2 className="mt-4 text-xl font-bold">Episode 1 is ready to begin.</h2>
              <p className="mt-2 text-sm leading-6 text-moss-700">
                We will prepare the story, illustrations, PDF, and email delivery automatically.
              </p>
              <div className="mt-4 rounded-md border border-moss-100 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-moss-900">
                  <Lock size={16} />
                  Character cast locked
                </div>
                <p className="mt-2 text-sm leading-6 text-moss-700">
                  Future episodes keep this cast and main character stable.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cast.map((member) => (
                    <span className="rounded-full bg-moon-100 px-3 py-1 text-xs font-semibold text-moon-900" key={member.characterId}>
                      {member.displayName} {member.role === "MAIN" ? "· main" : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-between gap-3">
            <Button disabled={step === 0} onClick={() => setStep((value) => Math.max(value - 1, 0))} variant="secondary">
              Back
            </Button>
            <Button
              disabled={submitting || (step === 2 && (castLoading || cast.length === 0))}
              onClick={() => {
                if (step === steps.length - 1) {
                  void submitOnboarding({
                    ageRange,
                    birthDate,
                    cast,
                    firstName,
                    parentNotes,
                    productId: moonlightMonthly.id,
                    readingLevel,
                    setError: setSubmitError,
                    setSubmitting,
                    storyGenres: selectedGenreOptions,
                    interests: selectedIngredientOptions,
                    onDone: (childId) => navigate(`/app/children/${childId}`)
                  });
                  return;
                }
                setStep((value) => Math.min(value + 1, steps.length - 1));
              }}
            >
              {step === steps.length - 1 ? submitting ? "Starting..." : "Start stories" : "Continue"}
              <ArrowRight size={16} />
            </Button>
          </div>
          {submitError ? (
            <div className="mt-4">
              <ErrorState message={submitError.message} title="Could not start stories" />
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );

  async function generateCast() {
    try {
      setCastLoading(true);
      setCastError(null);
      const generated = await apiClient.generateCharacterCast({
        ageRange,
        storyGenres: selectedGenreOptions,
        interests: selectedIngredientOptions
      });
      setCast(generated.map((member) => ({
        characterId: member.characterId,
        sourceCharacterId: member.sourceCharacterId ?? moonlightMonthly.universe.characters[0]?.id ?? "milo",
        displayName: member.displayName,
        species: member.species ?? "Character",
        description: member.description ?? "",
        personality: member.personality ?? "",
        role: member.role,
      })));
    } catch (error) {
      setCast([]);
      setCastError(error instanceof Error ? error : new Error("Could not generate characters"));
    } finally {
      setCastLoading(false);
    }
  }
}

async function submitOnboarding({
  ageRange,
  birthDate,
  cast,
  firstName,
  interests,
  parentNotes,
  productId,
  readingLevel,
  setError,
  setSubmitting,
  storyGenres,
  onDone,
}: {
  ageRange: AgeRange;
  birthDate: string;
  cast: CastMember[];
  firstName: string;
  interests: string[];
  parentNotes: string;
  productId: string;
  readingLevel: string;
  setError: (error: Error | null) => void;
  setSubmitting: (submitting: boolean) => void;
  storyGenres: string[];
  onDone: (childId: string) => void;
}) {
  try {
    setSubmitting(true);
    setError(null);
    const mainCharacter = cast.find((member) => member.role === "MAIN") ?? cast[0];
    if (!mainCharacter) throw new Error("Choose a main character.");
    const child = await apiClient.createChild({
      firstName: firstName.trim() || null,
      birthDate: birthDate.trim() || null,
      ageRange,
      readingLevel: supportsReadingLevel(ageRange) ? readingLevel : null,
      interests,
      favoriteCharacterIds: cast.map((member) => member.sourceCharacterId),
      selectedCharacters: cast,
      mainCharacterId: mainCharacter.characterId,
      likedThemes: [],
      dislikedThemes: [],
      storyGenres,
      optionalParentNotes: parentNotes.trim() || null,
    });
    await apiClient.createSubscription({ childId: child.id, productId, deliveryMethods: ["EMAIL"] });
    window.sessionStorage.setItem("little-world:active-child-id", child.id);
    onDone(child.id);
  } catch (error) {
    setError(error instanceof Error ? error : new Error("Unexpected onboarding error"));
  } finally {
    setSubmitting(false);
  }
}

function supportsReadingLevel(ageRange: AgeRange) {
  return ageRange === "6-8" || ageRange === "9-12";
}

function getAgeRangeFromBirthday(birthDate: string): AgeRange | null {
  if (!birthDate) return null;
  const birthday = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return null;
  const today = new Date();
  if (birthday > today) return null;

  let months = (today.getFullYear() - birthday.getFullYear()) * 12 + today.getMonth() - birthday.getMonth();
  if (today.getDate() < birthday.getDate()) months -= 1;
  const normalizedMonths = Math.max(months, 1);
  return ageRangeByMonth.find((range) => normalizedMonths <= range.maxMonths)?.value ?? "9-12";
}

function CharacterCastPicker({
  cast,
  error,
  loading,
  nameSuggestions,
  onMainCharacterChange,
  onPersonaChange,
  onRetry,
}: {
  cast: CastMember[];
  error: Error | null;
  loading: boolean;
  nameSuggestions: string[];
  onMainCharacterChange: (characterId: string) => void;
  onPersonaChange: (characterId: string, field: "displayName" | "description" | "personality", value: string) => void;
  onRetry: () => void;
}) {
  const [profileCharacter, setProfileCharacter] = useState<UniverseCharacter | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState(cast[0]?.characterId ?? "");
  const selectedMember = cast.find((member) => member.characterId === selectedCharacterId) ?? cast[0];
  const selectedProfile = selectedMember ? toProfileCharacter(selectedMember) : null;

  useEffect(() => {
    if (cast.length > 0 && !cast.some((member) => member.characterId === selectedCharacterId)) {
      setSelectedCharacterId(cast[0]?.characterId ?? "");
    }
  }, [cast, selectedCharacterId]);

  return (
    <Field hint="Generated for this little world. You can adjust names and persona before locking them in." label="Story cast">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-moss-100 bg-moon-50 p-3">
          <div>
            <p className="text-sm font-bold text-moss-900">Generated cast</p>
            <p className="text-xs leading-5 text-moss-700">Pick the main character and tune each character before the cast is locked.</p>
          </div>
          {loading ? <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-moss-700">Generating...</span> : null}
          {error ? <Button onClick={onRetry} type="button" variant="secondary">Retry</Button> : null}
        </div>
        {error ? <p className="rounded-md border border-petal-200 bg-petal-50 p-3 text-sm font-semibold text-petal-700">{error.message}</p> : null}

        {loading && cast.length === 0 ? (
          <div className="rounded-lg border border-moon-200 bg-white p-6 text-center">
            <Sparkles className="mx-auto animate-pulse text-moss-700" size={28} />
            <p className="mt-3 text-sm font-bold text-moss-900">Generating a unique cast...</p>
            <p className="mt-1 text-xs leading-5 text-moss-700">This can take a moment.</p>
          </div>
        ) : null}

        {!loading && cast.length === 0 && !error ? (
          <div className="rounded-lg border border-moon-200 bg-white p-6 text-center">
            <p className="text-sm font-bold text-moss-900">Character generation is ready.</p>
            <Button className="mt-3" onClick={onRetry} type="button" variant="secondary">Generate cast</Button>
          </div>
        ) : null}

        {cast.length > 0 ? (
          <>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            {cast.map((member) => (
              <button
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
                  selectedMember?.characterId === member.characterId
                    ? "border-moss-700 bg-moss-700 text-white"
                    : "border-moon-200 bg-white text-moss-800 hover:border-moss-300 hover:bg-moon-50"
                }`}
                key={member.characterId}
                onClick={() => setSelectedCharacterId(member.characterId)}
                type="button"
              >
                {member.displayName}
                {member.role === "MAIN" ? <Star aria-label="Main character" fill="currentColor" size={14} /> : null}
              </button>
            ))}
          </div>
        </div>

        {selectedMember && selectedProfile ? (
          <div className="relative rounded-lg border border-moss-100 bg-white p-4">
            <button
              aria-label={selectedMember.role === "MAIN" ? "Main character" : `Make ${selectedMember.displayName} the main character`}
              className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border transition ${
                selectedMember.role === "MAIN"
                  ? "border-honey-300 bg-honey-100 text-moss-900"
                  : "border-moon-200 bg-white text-moss-600 hover:border-honey-300 hover:bg-honey-50 hover:text-moss-900"
              }`}
              onClick={() => onMainCharacterChange(selectedMember.characterId)}
              type="button"
            >
              <Star fill={selectedMember.role === "MAIN" ? "currentColor" : "none"} size={18} />
            </button>

            <div className="flex flex-col gap-4 pr-12 sm:flex-row">
              <button className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-moss-100 bg-moon-50" onClick={() => setProfileCharacter(selectedProfile)} type="button">
                <img alt="" className="h-full w-full object-cover" src={selectedProfile.profileImages[0] ?? selectedProfile.portraitUrl} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss-600">{selectedMember.species}</p>
                <h3 className="mt-1 text-xl font-black text-moss-900">{selectedMember.displayName}</h3>
                <p className="mt-2 text-sm leading-6 text-moss-700">{selectedMember.description}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <Field label="Name">
                <TextInput list="character-name-suggestions" value={selectedMember.displayName} onChange={(event) => onPersonaChange(selectedMember.characterId, "displayName", event.target.value)} />
              </Field>
              <Field label="Description">
                <Textarea value={selectedMember.description} onChange={(event) => onPersonaChange(selectedMember.characterId, "description", event.target.value)} />
              </Field>
              <Field label="Personality">
                <Textarea value={selectedMember.personality} onChange={(event) => onPersonaChange(selectedMember.characterId, "personality", event.target.value)} />
              </Field>
            </div>
          </div>
        ) : null}
          </>
        ) : null}

        <datalist id="character-name-suggestions">
          {nameSuggestions.map((name) => <option key={name} value={name} />)}
        </datalist>
      </div>

      {profileCharacter ? <CharacterProfileModal character={profileCharacter} onClose={() => setProfileCharacter(null)} /> : null}
    </Field>
  );
}

function toProfileCharacter(member: CastMember): UniverseCharacter {
  const source = moonlightMonthly.universe.characters.find((character) => character.id === member.sourceCharacterId) ?? moonlightMonthly.universe.characters[0];

  return {
    id: member.characterId,
    name: member.displayName,
    species: member.species,
    description: member.description,
    personality: member.personality,
    portraitUrl: source?.portraitUrl ?? "",
    profileImages: source?.profileImages ?? [],
    hiddenStyleReferenceIds: source?.hiddenStyleReferenceIds ?? [],
    color: source?.color ?? "#6f8f52",
  };
}

function TagPicker({
  customValue,
  datalistId,
  onAddCustom,
  onCustomChange,
  onRemove,
  options,
  selected,
}: {
  customValue: string;
  datalistId: string;
  onAddCustom: () => void;
  onCustomChange: (value: string) => void;
  onRemove: (value: string) => void;
  options: string[];
  selected: string[];
}) {
  const availableOptions = options.filter((option) => !selected.includes(option));

  return (
    <div className="space-y-2">
      {selected.length > 0 ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            {selected.map((tag) => (
              <button
                aria-label={`Remove ${tag}`}
                className="inline-flex items-center gap-1 rounded-full border border-moss-300 bg-moss-50 px-3 py-1 text-xs font-bold text-moss-900 transition hover:border-moss-500 hover:bg-moss-100"
                key={tag}
                onClick={() => onRemove(tag)}
                type="button"
              >
                {tag}
                <span aria-hidden="true" className="text-sm leading-none">×</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex gap-2">
        <TextInput
          list={datalistId}
          onChange={(event) => onCustomChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCustom();
            }
          }}
          placeholder="Add your own"
          value={customValue}
        />
        <datalist id={datalistId}>
          {availableOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
        <Button disabled={!customValue.trim()} onClick={onAddCustom} type="button" variant="secondary">
          Add
        </Button>
      </div>
    </div>
  );
}

function addTag(value: string, selected: string[], setSelected: (values: string[]) => void) {
  const normalized = value.trim();
  if (!normalized || selected.includes(normalized)) return;
  setSelected([...selected, normalized]);
}
