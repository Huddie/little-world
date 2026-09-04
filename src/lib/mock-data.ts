import type { AdminBookIssue, BookIssue, DashboardData, Product, Universe } from "../types/client";
import { mockR2Image } from "./mock-r2";

const publicImagePointer = (seed: string): string => `r2://book-assets/mock-public/${seed}.webp`;
const illustration = (seed: string): string => mockR2Image(publicImagePointer(seed));
const styleReference = (seed: string): string => `r2://book-assets/character-style/${seed}.webp`;

export const moonlightForest: Universe = {
  id: "universe_moonlight_forest",
  slug: "moonlight-forest",
  name: "Little World",
  description: "A growing story world that remembers favorite characters, past adventures, and newly discovered places.",
  locations: ["Pebble Bridge", "Moonberry Hill", "Whispering Creek"],
  characters: [
    {
      id: "milo",
      name: "Milo",
      species: "Bear",
      description: "Adventurous and steady, the first to peek around a bend.",
      personality: "Warm, bold, encouraging, and sometimes a little too quick to rush ahead.",
      portraitUrl: illustration("character-milo-portrait"),
      profileImages: [illustration("milo-profile-1"), illustration("milo-profile-2"), illustration("milo-profile-3")],
      hiddenStyleReferenceIds: [styleReference("milo-front"), styleReference("milo-side"), styleReference("milo-expression"), styleReference("milo-silhouette")],
      color: "#6f8f52",
    },
    {
      id: "pip",
      name: "Pip",
      species: "Rabbit",
      description: "Nervous, clever, and always listening for the smallest clue.",
      personality: "Careful, witty, observant, and proud when small plans work.",
      portraitUrl: illustration("character-pip-portrait"),
      profileImages: [illustration("pip-profile-1"), illustration("pip-profile-2"), illustration("pip-profile-3")],
      hiddenStyleReferenceIds: [styleReference("pip-front"), styleReference("pip-side"), styleReference("pip-expression"), styleReference("pip-silhouette")],
      color: "#8fa8cf",
    },
    {
      id: "juniper",
      name: "Juniper",
      species: "Fox",
      description: "Playful, mischievous, and full of bright ideas.",
      personality: "Curious, dramatic, generous, and happiest when a surprise turns kind.",
      portraitUrl: illustration("character-juniper-portrait"),
      profileImages: [illustration("juniper-profile-1"), illustration("juniper-profile-2"), illustration("juniper-profile-3")],
      hiddenStyleReferenceIds: [styleReference("juniper-front"), styleReference("juniper-side"), styleReference("juniper-expression"), styleReference("juniper-silhouette")],
      color: "#c96f5a",
    },
    {
      id: "tuck",
      name: "Tuck",
      species: "Turtle",
      description: "Thoughtful, kind, and usually right after a little pause.",
      personality: "Patient, observant, practical, and gentle when friends feel stuck.",
      portraitUrl: illustration("character-tuck-portrait"),
      profileImages: [illustration("tuck-profile-1"), illustration("tuck-profile-2"), illustration("tuck-profile-3")],
      hiddenStyleReferenceIds: [styleReference("tuck-front"), styleReference("tuck-side"), styleReference("tuck-expression"), styleReference("tuck-silhouette")],
      color: "#d99a2b",
    },
  ],
};

export const moonlightMonthly: Product = {
  id: "product_moonlight_forest_monthly",
  slug: "little-world-monthly",
  name: "Little World Monthly",
  universe: moonlightForest,
  frequencyLabel: "Monthly",
  deliveryOptions: [
    {
      method: "EMAIL",
      availability: "ENABLED",
      label: "Email PDF",
      description: "A secure download link arrives automatically each month.",
    },
    {
      method: "MAIL",
      availability: "COMING_SOON",
      label: "Printed mail",
      description: "Physical storybooks are planned for a future release.",
    },
  ],
};

const workflow = [
  { id: "planning", label: "Planning story", status: "COMPLETE" as const, timestamp: "2026-08-03T14:10:00Z" },
  { id: "pages", label: "Creating pages", status: "COMPLETE" as const, timestamp: "2026-08-03T14:12:00Z" },
  { id: "art", label: "Generating illustrations", status: "COMPLETE" as const, timestamp: "2026-08-03T14:19:00Z" },
  { id: "qa", label: "Checking story quality", status: "COMPLETE" as const, timestamp: "2026-08-03T14:22:00Z" },
  { id: "pdf", label: "Preparing PDF", status: "COMPLETE" as const, timestamp: "2026-08-03T14:25:00Z" },
  { id: "delivery", label: "Sending email", status: "COMPLETE" as const, timestamp: "2026-08-03T14:26:00Z" },
];

export const books: BookIssue[] = [
  {
    id: "issue_7",
    supportCode: "LW-ISSUE7",
    episodeNumber: 7,
    title: "Pip and the Moonberry Mystery",
    subtitle: "A soft-footed clue hunt near Moonberry Hill",
    status: "DELIVERED",
    scheduledFor: "2026-08-03",
    readyAt: "2026-08-03T14:25:00Z",
    deliveredAt: "2026-08-03T14:26:00Z",
    coverUrl: illustration("pip-moonberry-cover"),
    pdfUrl: "/api/books/issue_7/download",
    summary:
      "Pip worried that the moonberries were disappearing, then discovered Tuck had moved them to keep them safe from rain.",
    workflow,
    pages: [
      {
        id: "page_7_1",
        pageNumber: 1,
        pageType: "COVER",
        text: "Pip and the Moonberry Mystery",
        illustrationUrl: illustration("pip-cover"),
      },
      {
        id: "page_7_2",
        pageNumber: 2,
        pageType: "STORY",
        text: "Pip found a trail of silver leaves curling away from Moonberry Hill.",
        illustrationUrl: illustration("silver-leaves"),
      },
      {
        id: "page_7_3",
        pageNumber: 3,
        pageType: "STORY",
        text: "Milo carried the lantern while Juniper counted every tiny footprint.",
        illustrationUrl: illustration("lantern-friends"),
      },
      {
        id: "page_7_4",
        pageNumber: 4,
        pageType: "ENDING",
        text: "At Whispering Creek, Tuck smiled and shared warm moonberry muffins with everyone.",
        illustrationUrl: illustration("moonberry-muffins"),
      },
    ],
  },
  {
    id: "issue_6",
    supportCode: "LW-ISSUE6",
    episodeNumber: 6,
    title: "The Lantern Under Pebble Bridge",
    subtitle: null,
    status: "DELIVERED",
    scheduledFor: "2026-07-03",
    readyAt: "2026-07-03T13:21:00Z",
    deliveredAt: "2026-07-03T13:24:00Z",
    coverUrl: illustration("pebble-bridge-cover"),
    pdfUrl: "/api/books/issue_6/download",
    summary: "Milo and Emma helped Pip learn that a dark bridge can still hold a friendly light.",
    workflow,
    pages: [],
  },
  {
    id: "issue_8",
    supportCode: "LW-ISSUE8",
    episodeNumber: 8,
    title: "Juniper's Firefly Map",
    subtitle: "Currently being prepared",
    status: "GENERATING",
    scheduledFor: "2026-09-03",
    readyAt: null,
    deliveredAt: null,
    coverUrl: illustration("juniper-firefly-map"),
    pdfUrl: null,
    summary: "Episode 8 is in progress. The story team is creating pages and illustrations.",
    workflow: [
      { id: "planning", label: "Planning story", status: "COMPLETE", timestamp: "2026-09-03T12:10:00Z" },
      { id: "pages", label: "Creating pages", status: "CURRENT", timestamp: "2026-09-03T12:12:00Z" },
      { id: "art", label: "Generating illustrations", status: "PENDING", timestamp: null },
      { id: "qa", label: "Checking story quality", status: "PENDING", timestamp: null },
      { id: "pdf", label: "Preparing PDF", status: "PENDING", timestamp: null },
      { id: "delivery", label: "Sending email", status: "PENDING", timestamp: null },
    ],
    pages: [],
  },
];

export const dashboardData: DashboardData = {
  user: {
    id: "user_1",
    name: "Avery Adler",
    email: "avery@example.com",
  },
  children: [
    {
      id: "child_emma",
      firstName: null,
      birthDate: null,
      ageRange: "2-3",
      readingLevel: "Early reader",
      worldBuildStatus: "BUILDING",
      activeSubscriptionId: "sub_emma_moonlight",
      latestBookIssueId: "issue_8",
      latestBookStatus: "GENERATING",
      archivedAt: null,
    },
  ],
  child: {
    id: "child_emma",
    firstName: null,
    birthDate: null,
    ageRange: "2-3",
    readingLevel: "Early reader",
    storyGenres: ["gentle mystery", "friendship"],
    interests: ["mysteries", "baking", "fireflies"],
    favoriteCharacters: ["milo", "pip", "juniper"],
    selectedCharacters: [
      {
        characterId: "generated-bramble",
        sourceCharacterId: "milo",
        displayName: "Bramble",
        species: "Tiny bear",
        description: "A brave little helper who carries a pouch of found buttons and notices when friends need courage.",
        personality: "Gentle, protective, curious, and quick to turn a problem into a team mission.",
        role: "MAIN",
      },
      {
        characterId: "generated-nori",
        sourceCharacterId: "pip",
        displayName: "Nori",
        species: "Moon rabbit",
        description: "A soft-footed map keeper who listens closely and finds clues in very small places.",
        personality: "Thoughtful, observant, a little cautious, and proud when careful plans work.",
        role: "SUPPORTING",
      },
      {
        characterId: "generated-lulu",
        sourceCharacterId: "juniper",
        displayName: "Lulu",
        species: "Little fox",
        description: "A bright idea-maker with paint on her paws and a habit of turning ordinary paths into parades.",
        personality: "Playful, inventive, warm, and happiest when a surprise becomes kind.",
        role: "SUPPORTING",
      },
    ],
    charactersLockedAt: "2026-06-03T12:00:00Z",
    worldBuildStatus: "BUILDING",
    parentNotes: "Likes gentle surprises and stories where nervous characters become brave.",
  },
  subscription: {
    id: "sub_emma_moonlight",
    status: "ACTIVE",
    product: moonlightMonthly,
    frequency: "MONTHLY",
    childSlots: 3,
    usedChildSlots: 1,
    deliveryEmail: "avery@example.com",
    nextIssueAt: "2026-10-03",
    nextPaymentAt: "2026-10-03",
    lastIssueAt: "2026-08-03",
    deliveryMethods: ["EMAIL"],
  },
  currentIssue: books[2]!,
  books,
  relationships: [
    {
      id: "rel_demo_friend",
      status: "ACTIVE",
      direction: "OUTGOING",
      canAccept: false,
      createdAt: "2026-08-12T12:00:00Z",
      acceptedAt: "2026-08-12T14:00:00Z",
    },
  ],
};

export const adminIssues: AdminBookIssue[] = books.map((book, index) => ({
  ...book,
  childLabel: index === 1 ? "Profile without name" : "Ages 2-3",
  parentEmail: index === 1 ? "sam@example.com" : "avery@example.com",
  qaResult: book.status === "GENERATING" ? "REVIEW" : "PASS",
  rawError: null,
  deliveryAttempts:
    book.status === "DELIVERED"
      ? [
          {
            id: `attempt_${book.id}`,
            method: "EMAIL",
            status: "SENT",
            attemptedAt: book.deliveredAt ?? book.scheduledFor,
            detail: "Secure PDF link sent through Resend.",
          },
        ]
      : [],
}));
