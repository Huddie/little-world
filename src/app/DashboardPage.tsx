import { CalendarDays, Link2, Lock, Mail, PencilLine, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CharacterProfileModal } from "../components/characters/CharacterProfileModal";
import { BookCard } from "../components/parent/BookCard";
import { Artwork } from "../components/ui/Artwork";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, Textarea, TextInput } from "../components/ui/Form";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { apiClient } from "../lib/api-client";
import { formatDate } from "../lib/format";
import { ApiError } from "../lib/http-api-client";
import { useAsyncResource } from "../lib/use-async-resource";
import type { DashboardData, SelectedCharacter, UniverseCharacter } from "../types/client";

export function DashboardPage() {
  const { childId } = useParams<{ childId: string }>();
  const dashboard = useAsyncResource(() => apiClient.getDashboard(childId), [childId]);
  const [cachedDashboard, setCachedDashboard] = useState<DashboardData | null>(() => readCachedDashboard());
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<SelectedCharacter | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [relationshipError, setRelationshipError] = useState<Error | null>(null);
  const [relationshipBusy, setRelationshipBusy] = useState(false);

  useEffect(() => {
    if (dashboard.status === "success") {
      window.sessionStorage.setItem("little-world:active-child-id", dashboard.data.child.id);
      setNotes(dashboard.data.child.parentNotes);
      setCachedDashboard(dashboard.data);
      writeCachedDashboard(dashboard.data);
    }
  }, [dashboard.status, dashboard.data]);

  const data = dashboard.status === "success" ? dashboard.data : cachedDashboard;

  if (dashboard.status === "loading" && !data) {
    return <DashboardSkeleton />;
  }

  if (dashboard.status === "error" && !data) {
    if (dashboard.error instanceof ApiError && dashboard.error.status === 401) {
      return (
        <ErrorState
          action={<Button onClick={() => window.location.assign("/sign-in")}>Sign in</Button>}
          message="Sign in with your parent email to open your story shelf."
          title="Sign-in required"
        />
      );
    }

    return dashboard.error instanceof ApiError && dashboard.error.status === 404 ? (
      <EmptyState
        action={<Button onClick={() => window.location.assign("/onboarding")}>Start onboarding</Button>}
        message="Create a profile, choose a story cast, and schedule the first recurring book."
        title="No active story collection yet"
      />
    ) : (
      <ErrorState message={dashboard.error.message} onRetry={dashboard.reload} title="Could not load dashboard" />
    );
  }

  if (!data) return <DashboardSkeleton />;
  const activeDashboard = data;
  const deliveredBooks = activeDashboard.books.filter((book) => book.status === "DELIVERED");
  const collectionLabel = activeDashboard.child.firstName ? `${activeDashboard.child.firstName}'s story shelf` : "Story shelf";
  const selectedProfile = selectedCastMember ? resolveSelectedProfile(activeDashboard, selectedCastMember) : null;
  const buildingWorld = activeDashboard.child.worldBuildStatus === "BUILDING";

  return (
    <div className="space-y-8">
      {childId ? null : (
        <div className="rounded-lg border border-moon-200 bg-white p-3 text-sm font-semibold text-moss-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
          Managing {activeDashboard.children.length} {activeDashboard.children.length === 1 ? "child" : "children"}.{" "}
          <Link className="font-black text-moon-700 hover:text-moon-900" to="/app/children">Manage children</Link>
        </div>
      )}
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_190px] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-honey-100 px-3 py-1 text-sm font-semibold text-moss-900 dark:bg-honey-300/18 dark:text-honey-100">
                <Sparkles size={16} />
                {activeDashboard.subscription.product.universe.name}
              </div>
              <h1 className="text-3xl font-black tracking-normal sm:text-4xl">{collectionLabel}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-moss-700 dark:text-slate-300">
                Monthly personalized adventures with a recurring cast. The next story is handled automatically.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge status={data.subscription.status} />
                <span className="rounded-full bg-moon-100 px-2.5 py-1 text-xs font-semibold text-moon-900 dark:bg-moon-300/18 dark:text-moon-100">
                Ages {activeDashboard.child.ageRange}
                </span>
                {activeDashboard.child.readingLevel ? (
                  <span className="rounded-full bg-moon-100 px-2.5 py-1 text-xs font-semibold text-moon-900 dark:bg-moon-300/18 dark:text-moon-100">
                    {activeDashboard.child.readingLevel}
                  </span>
                ) : null}
                {activeDashboard.child.storyGenres.map((genre) => (
                  <span className="rounded-full bg-moon-100 px-2.5 py-1 text-xs font-semibold text-moon-900 dark:bg-moon-300/18 dark:text-moon-100" key={genre}>
                    {genre}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-moss-100 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-sm font-bold text-moss-900 dark:text-slate-100">
                  <Lock size={16} />
                  Locked story cast
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeDashboard.child.selectedCharacters.map((character) => (
                    <button
                      className="rounded-full bg-moss-100 px-2.5 py-1 text-xs font-semibold text-moss-900 transition hover:bg-moss-200 focus:outline-none focus:ring-4 focus:ring-moon-100 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 dark:focus:ring-moon-300/20"
                      key={character.characterId}
                      onClick={() => setSelectedCastMember(character)}
                      type="button"
                    >
                      {character.displayName} {character.role === "MAIN" ? "· main" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-moss-50 p-4 dark:bg-white/8">
              <Artwork className="aspect-square w-full rounded-md" label="Cover art is being prepared" pendingLabel="Generating cover" src={activeDashboard.currentIssue.coverUrl} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{buildingWorld ? "Building world" : "Next story"}</h2>
              <p className="text-sm text-moss-700 dark:text-slate-300">Episode {activeDashboard.currentIssue.episodeNumber}</p>
            </div>
            <StatusBadge status={buildingWorld ? "GENERATING" : activeDashboard.currentIssue.status} />
          </div>
          <h3 className="text-xl font-black">{buildingWorld ? "Character portraits and style references are being prepared." : activeDashboard.currentIssue.title}</h3>
          <div className="mt-4 grid gap-3 text-sm text-moss-700 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <CalendarDays size={16} />
              Scheduled {formatDate(activeDashboard.currentIssue.scheduledFor)}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} />
              Email delivery selected
            </p>
          </div>
          <div className="mt-5 rounded-lg bg-moss-50 p-4 dark:bg-white/8">
            <p className="text-sm font-semibold text-moss-900 dark:text-slate-100">{buildingWorld ? "Building your little world..." : parentStatusCopy(activeDashboard.currentIssue.status)}</p>
            <p className="mt-1 text-sm leading-6 text-moss-700 dark:text-slate-300">
              {buildingWorld
                ? "The first story will start after the world is ready."
                : activeDashboard.currentIssue.status === "FAILED"
                  ? `Please share support code ${activeDashboard.currentIssue.supportCode} if you contact support.`
                  : "We’ll show the current status here and email you when the next book is ready."}
            </p>
          </div>
        </Card>
      </section>

      {buildingWorld ? (
        <Card className="p-6">
          <h2 className="text-2xl font-black">Building world...</h2>
          <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">
            We’re preparing the recurring cast images and style references. Stories begin after this step completes.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {activeDashboard.child.selectedCharacters.map((character) => (
              <div className="rounded-lg border border-moon-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950" key={character.characterId}>
                <Artwork
                  className="aspect-square w-full rounded-md"
                  label={`${character.displayName} portraits are being prepared`}
                  pendingLabel="Building world"
                  src={character.profileImageUrls?.[0]}
                />
                <p className="mt-3 text-sm font-black text-moss-900 dark:text-slate-100">{character.displayName}</p>
                <p className="mt-1 text-xs font-semibold text-moss-700 dark:text-slate-300">{character.imageStatus ?? "PENDING"}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Book collection</h2>
              <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Completed episodes stay here for reading and downloads.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {deliveredBooks.map((book) => (
              <BookCard book={book} key={book.id} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center gap-2">
              <Link2 size={18} />
              <h2 className="text-lg font-bold">Connected worlds</h2>
            </div>
            <p className="text-sm leading-6 text-moss-700 dark:text-slate-300">
              Invite another parent. If they accept, future stories may occasionally share a gentle adventure.
            </p>
            <div className="mt-4 space-y-3">
              {activeDashboard.relationships.length > 0 ? activeDashboard.relationships.map((relationship) => (
                <div className="rounded-md border border-moss-100 p-3 dark:border-white/10" key={relationship.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-moss-900 dark:text-slate-100">{relationship.direction === "INCOMING" ? "Incoming invite" : "World connection"}</p>
                    <StatusBadge status={relationship.status === "ACTIVE" ? "ACTIVE" : relationship.status === "PENDING" ? "SCHEDULED" : "FAILED"} />
                  </div>
                  {relationship.canAccept ? (
                    <div className="mt-3 flex gap-2">
                      <Button disabled={relationshipBusy} onClick={() => updateRelationship(relationship.id, "ACTIVE")} variant="secondary">Accept</Button>
                      <Button disabled={relationshipBusy} onClick={() => updateRelationship(relationship.id, "REJECTED")} variant="ghost">Decline</Button>
                    </div>
                  ) : null}
                </div>
              )) : <p className="rounded-md bg-moss-50 p-3 text-sm text-moss-700 dark:bg-white/8 dark:text-slate-300">No connected worlds yet.</p>}
            </div>
            <div className="mt-4 grid gap-3">
              <Field hint="Parent-controlled only. No child search or public profiles." label="Invite parent email">
                <TextInput
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="friend@example.com"
                  type="email"
                  value={inviteEmail}
                />
              </Field>
              <Button disabled={relationshipBusy || !inviteEmail.trim()} onClick={inviteRelationship} variant="secondary">
                {relationshipBusy ? "Sending..." : "Invite"}
              </Button>
              {relationshipError ? <p className="text-sm font-semibold text-petal-500">{relationshipError.message}</p> : null}
            </div>
          </Card>

          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center gap-2">
              <PencilLine size={18} />
              <h2 className="text-lg font-bold">Story inspiration</h2>
            </div>
            <Field hint="Optional notes can guide future stories. Keep it simple and parent-controlled." label="Parent notes">
              <Textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
            </Field>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-moss-700 dark:text-slate-300">{saved ? "Saved for future episodes." : "Used as gentle guidance."}</p>
              <Button
                onClick={() => {
                  void apiClient.saveStoryInspiration(notes).then(() => setSaved(true));
                }}
                variant="secondary"
              >
                Save notes
              </Button>
            </div>
          </Card>
        </div>
      </section>
      )}

      {selectedProfile ? (
        <CharacterProfileModal
          character={selectedProfile}
          displayName={selectedCastMember?.displayName}
          onClose={() => setSelectedCastMember(null)}
          role={selectedCastMember?.role}
        />
      ) : null}
    </div>
  );

  function inviteRelationship() {
    setRelationshipBusy(true);
    setRelationshipError(null);
    void apiClient.inviteRelationship({ childId: activeDashboard.child.id, inviteeParentEmail: inviteEmail.trim() })
      .then(() => {
        setInviteEmail("");
        dashboard.reload();
      })
      .catch((error: unknown) => setRelationshipError(error instanceof Error ? error : new Error("Could not send invite")))
      .finally(() => setRelationshipBusy(false));
  }

  function updateRelationship(id: string, status: "ACTIVE" | "REJECTED") {
    setRelationshipBusy(true);
    setRelationshipError(null);
    void apiClient.updateRelationshipStatus(id, status)
      .then(dashboard.reload)
      .catch((error: unknown) => setRelationshipError(error instanceof Error ? error : new Error("Could not update invite")))
      .finally(() => setRelationshipBusy(false));
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-h-[280px] p-6">
          <LoadingState label="Loading story collection" />
        </Card>
        <Card className="min-h-[280px] p-6"><div /></Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="min-h-[320px] p-6"><div /></Card>
        <div className="space-y-6">
          <Card className="min-h-[220px] p-5"><div /></Card>
          <Card className="min-h-[220px] p-5"><div /></Card>
        </div>
      </section>
    </div>
  );
}

function readCachedDashboard(): DashboardData | null {
  try {
    const value = window.sessionStorage.getItem("little-world:dashboard");
    return value ? (JSON.parse(value) as DashboardData) : null;
  } catch {
    return null;
  }
}

function writeCachedDashboard(data: DashboardData) {
  try {
    window.sessionStorage.setItem("little-world:dashboard", JSON.stringify(data));
  } catch {
    // Ignore storage failures; cache is only a rendering optimization.
  }
}

function parentStatusCopy(status: DashboardData["currentIssue"]["status"]): string {
  if (status === "DELIVERED") return "Ready in the collection";
  if (status === "FAILED") return "We hit a problem and will retry";
  if (status === "DELIVERY_PENDING" || status === "READY") return "Almost ready to send";
  if (status === "SCHEDULED") return "Scheduled for creation";
  return "Your next story is being prepared";
}

function resolveSelectedProfile(data: DashboardData, selected: SelectedCharacter): UniverseCharacter | null {
  const source = data.subscription.product.universe.characters.find((character) => character.id === (selected.sourceCharacterId ?? selected.characterId));
  if (!source) return null;

  return {
    ...source,
    id: selected.characterId,
    name: selected.displayName,
    species: selected.species || source.species,
    description: selected.description || source.description,
    personality: selected.personality || source.personality,
    portraitUrl: selected.profileImageUrls?.[0] ?? "",
    profileImages: selected.profileImageUrls ?? [],
  };
}
