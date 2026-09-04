This is a copy of a shared ChatGPT chat. It won't be added to memory.

Report conversation

That actually makes the architecture cleaner. If you're already all-in on Cloudflare, I’d keep Cloudflare as the entire application/data layer rather than introducing Supabase just for Postgres.

For this particular product, I'd structure it around D1 + R2 + Vectorize + Durable Objects, with Workers orchestrating everything.

Recommended Cloudflare architecture
                         ┌──────────────────┐
                         │      Customer    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         Cloudflare Worker
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                  D1             R2        Vectorize
             structured DB    books/assets   semantic
                    │                         memory
                    │
                    ▼
             Durable Object
             per MEMBER
                    │
                    ▼
              Story Engine
                    │
             ┌──────┴──────┐
             ▼             ▼
           LLM API       Image API
             │             │
             └──────┬──────┘
                    ▼
                  R2
              final PDF/assets
                    │
                    ▼
             Print fulfillment
The key decision: D1 is your source of truth

I'd put the structured memory in D1.

Something like:

members
characters
people
locations

events
memories
relationships

stories
story_events

character_state
world_state
preferences

Every table that is member-specific has:

member_id

So you effectively have:

member_123
  ├── profile
  ├── memories
  ├── events
  ├── relationships
  ├── stories
  └── state

member_456
  ├── profile
  ├── memories
  ├── events
  ├── relationships
  ├── stories
  └── state
R2 is the "big stuff"

Don't put books or images in D1.

R2:

members/
  123/
    stories/
      001/
        manuscript.json
        illustrations/
        book.pdf
      002/
        manuscript.json
        illustrations/
        book.pdf

You can also keep the canonical story artifacts there.

For example:

{
  "story_id": "002",
  "title": "Pip and the Midnight Train",
  "summary": "...",
  "events": [...],
  "canon_changes": [...],
  "characters": [...],
  "locations": [...]
}

D1 stores the searchable metadata; R2 stores the full artifact.

Vectorize is the semantic-memory layer

This is where I'd put embeddings for things like:

"Emma was fascinated by trains this month."

"Emma was nervous when she first met the dog."

"She really liked the story where Pip lost her backpack."

"Emma laughed when Tuck fell into the pond."

Each vector has metadata:

{
  "member_id": "123",
  "type": "memory",
  "date": "2026-08-15",
  "importance": 0.8,
  "source": "parent_input"
}

Critically: always filter by member_id.

So your semantic search becomes conceptually:

Vectorize.query(
    embedding,
    filter = { member_id: "123" }
)

You don't want semantic search across everyone's children's memories.

Durable Objects are particularly interesting here

This is where Cloudflare gives you something that maps nicely to your product.

I'd consider:

One Durable Object per member.

Not necessarily because you need it for storage, but because it gives you a natural actor representing the child's story universe.

MemberDO("member_123")

could manage:

Emma's Universe
├── current state
├── pending story
├── generation lock
├── story history
├── character state
└── memory updates

Then:

MemberDO("member_456")

is completely independent.

This also helps prevent something like:

Monday 02:00
Generate Book #18

Monday 02:01
Generate Book #18 again

because the Durable Object can coordinate generation.

The really important piece: Memory Extraction

I'd actually make memory extraction its own AI job.

Parent says:

"Emma saw Grandma this weekend and they went to the zoo. She loved the penguins."

Your system doesn't simply save that text.

It calls an LLM:

Extract durable memories from this parent update.
Return structured events, entities, relationships,
preferences and temporal information.

LLM returns:

{
  "events": [
    {
      "type": "visit",
      "subject": "Emma",
      "object": "Grandma",
      "date": "2026-08-30"
    },
    {
      "type": "visit",
      "subject": "Emma",
      "location": "zoo",
      "date": "2026-08-30"
    }
  ],

  "preferences": [
    {
      "subject": "Emma",
      "preference": "penguins",
      "sentiment": "strong_positive"
    }
  ]
}

Then your application validates and writes those facts to D1.

The LLM doesn't directly own memory.

That's an important design principle.

Then story generation becomes a retrieval problem

When Book #19 needs to be generated:

generate_story(member_id)

Worker asks:

D1
Who is this child?
What is currently true?
What happened recently?
Who are the important people?
What are the current relationships?
What stories were recently written?
Vectorize
What memories are semantically relevant to this story?
What does the child seem to care about?
What experiences might inspire this episode?
R2

Retrieve:

Previous story summaries
Relevant canon
Character bible
World bible

Then create:

{
  "child": {...},
  "current_state": {...},
  "recent_events": [...],
  "relevant_memories": [...],
  "relationships": [...],
  "recent_stories": [...],
  "world_canon": [...],
  "character_canon": [...],
  "constraints": [...]
}

That JSON becomes the LLM's input.

I would NOT put the entire history into the prompt

This is the trap I'd avoid.

After 100 books you might have:

100 × 2,000 tokens = 200,000 tokens

of history.

Instead:

                  ALL HISTORY
                       │
                       ▼
                Retrieval layer
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Current state   Recent events   Relevant memories
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                  ~5–15K tokens
                       │
                       ▼
                     LLM

The model gets the right history, not all history.

One more thing I'd change from my previous answer

I would not make the raw JSON in R2 the canonical memory.

I'd make:

D1 = truth

R2 = artifacts

Vectorize = semantic index

Durable Object = per-member orchestration/state

Workers = business logic

That gives you a very Cloudflare-native stack:

Cloudflare
│
├── Workers        → API + business logic
├── D1             → structured memory/state
├── R2             → PDFs/images/manuscripts
├── Vectorize      → semantic retrieval
├── Durable Objects→ member-level coordination
├── Queues         → async generation/fulfillment jobs
├── Cron Triggers  → scheduled books
└── Access/Turnstile/etc.

And Queues are particularly useful once you have hundreds/thousands of subscribers: generating 1,000 books on the same night shouldn't be one giant Worker invocation. You enqueue jobs and process them asynchronously.

This is a pretty good fit for your original goal of a mostly autonomous business: the "company" becomes essentially a set of scheduled Cloudflare workflows that continually turn member state into new physical products.

If you want, I can:

Explain how Durable Objects coordinate story generation per member
Describe the role of memory extraction AI job in the architecture
Outline steps Workers take to generate a story using all components