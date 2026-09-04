# Build a Recurring AI-Generated Children’s Storybook Platform

You are acting as a senior staff engineer and product engineer. Build a production-quality MVP for the product described below.

Do not treat this as a toy/demo. Build a clean, maintainable application that I can continue developing into a real business.

At the same time, DO NOT overengineer it. Prefer simple architecture, a single TypeScript application, Cloudflare-native infrastructure, and well-defined abstractions over microservices or unnecessary infrastructure.

If a minor implementation decision is unspecified, make a sensible choice and continue rather than blocking on questions.

Use current stable versions of libraries and verify current Cloudflare/OpenAI/Resend APIs against their documentation when implementing them.

---

# 1. Product concept

We are building a recurring children’s storytelling product.

A parent creates a profile for their child and subscribes the child to a fictional story universe.

The child then receives recurring personalized storybook episodes involving persistent fictional characters.

The important product distinction is that these are NOT isolated AI-generated stories.

The product maintains:

* recurring fictional characters
* persistent character personalities
* persistent locations
* world canon
* previous episode history
* continuity
* long-term character development
* child-specific preferences
* child-specific story history
* eventually shared canon between real-life friends

Think:

**serialized children's television + collectible children’s books + personalization + AI-generated episodes**

rather than:

**“Generate a random AI story for my child.”**

The first universe will be called:

# Moonlight Forest

Initial recurring characters can be seeded as:

* Milo — adventurous bear
* Pip — nervous but clever rabbit
* Juniper — mischievous fox
* Tuck — thoughtful turtle

The architecture must make universes and characters data-driven rather than hardcoded.

---

# 2. MVP product

The first version is FREE.

There is NO Stripe integration.

There is NO payment system.

There is NO physical-printing integration yet.

There IS a real subscription/domain model even though subscriptions are currently free.

The MVP flow is:

```text
Parent creates account
        ↓
Creates child profile
        ↓
Subscribes child to Moonlight Forest
        ↓
Chooses EMAIL as delivery method
        ↓
System creates recurring Book Issues
        ↓
Book-generation workflow runs automatically
        ↓
AI generates story
        ↓
AI generates illustrations
        ↓
Automated QA runs
        ↓
Printable PDF is generated
        ↓
PDF is stored
        ↓
Parent automatically receives an email
        ↓
Next issue is scheduled
```

The parent should not need to press “generate my next book” each month.

Recurring delivery is part of the experience.

---

# 3. Important future product direction

The schema and domain model MUST be designed so these can be added later without redesigning the application:

## Physical mail

Subscriptions will eventually support physical delivery.

Delivery methods:

```text
EMAIL
MAIL
```

MAIL should initially appear as:

```text
Coming soon
```

Do NOT implement POD fulfillment yet.

Do make the delivery layer extensible so a future implementation can look like:

```ts
deliver(bookIssue, subscription)
```

with implementations such as:

```ts
EmailDeliveryProvider
MailDeliveryProvider
```

MAIL will eventually:

* collect postal address
* generate printer-specific PDF
* send order to POD API
* track fulfillment
* track shipping

But do not build that now.

---

# 4. Friend/shared-world concept

This is an important future differentiator.

If two families both use the service, parents should eventually be able to indicate that their children are friends.

Their fictional story worlds can then overlap.

For example:

```text
Emma ↔ Noah
```

Emma's stories can contain fictional events involving characters associated with Noah's stories.

Noah's stories can reference the same shared events.

Eventually they may receive complementary perspectives on the same event.

Example:

Emma receives:

```text
The Secret Under Pebble Bridge
Lumi's Story
```

Noah receives:

```text
The Secret Under Pebble Bridge
Bramble's Story
```

The books contain different parts or perspectives of the same shared fictional event.

This encourages children to:

* bring their books to friends' houses
* share books
* compare stories
* collect episodes
* discuss what happened in another child's version

This should NEVER become a children's social network.

All relationships are parent-controlled.

Do NOT implement:

* public child profiles
* child messaging
* child search
* usernames for children
* child-created friend requests
* location sharing

Future friendship creation should be:

```text
Parent A
   ↓
invites
   ↓
Parent B
   ↓
explicitly accepts
   ↓
relationship becomes active
```

For the MVP:

* architect the schema to support relationships/shared canon
* basic models/tables may be created
* full crossover-story UI does NOT need to ship unless it is trivial
* individual recurring storytelling is the priority

---

# 5. Technology stack

Use the following stack.

## Language

TypeScript everywhere.

Use strict TypeScript.

Avoid `any` unless genuinely unavoidable.

---

## Frontend

Use:

* React
* Vite
* TypeScript
* Tailwind CSS

This is primarily an application, not a content-heavy SSR site.

Do NOT use Next.js unless there is an extremely compelling technical reason.

---

## Backend

Use:

* Cloudflare Workers
* Hono

The frontend and backend should preferably live in one repository.

Expose normal API routes such as:

```text
/api/auth/*
/api/children
/api/children/:id
/api/subscriptions
/api/books
/api/books/:id
/api/profile
/api/admin/*
```

Keep business logic outside route handlers.

---

## Database

Use:

* Cloudflare D1
* Drizzle ORM

All schema changes must use migrations.

Do not store images or PDFs in D1.

D1 contains metadata and application state.

---

## File/object storage

Use Cloudflare R2.

Store:

* generated illustrations
* rendered books
* thumbnails if needed
* intermediate generation assets if useful

Use immutable identifiers for actual stored assets.

Do not make application logic depend heavily on human-readable R2 paths.

---

## Durable workflows

Use Cloudflare Workflows.

Book generation is a durable workflow.

Do NOT implement the entire generation pipeline as one synchronous HTTP request.

The workflow must survive:

* OpenAI failures
* image-generation failures
* email-provider failures
* Worker restarts
* temporary network failures

Completed workflow steps should not unnecessarily be repeated.

---

## Scheduling

Use Cloudflare Cron Triggers.

The cron process should be simple:

```text
Find active subscriptions whose next issue is due
        ↓
Create BookIssue if one does not already exist
        ↓
Start GenerateBookWorkflow
```

The scheduler itself should not contain generation logic.

Make this idempotent.

Running the cron twice must not create duplicate issues.

---

## Authentication

Use Better Auth if it integrates cleanly with Workers + D1.

Prefer:

* email login
* magic link/passwordless if practical

Google OAuth can be added if straightforward.

Do not build custom authentication.

Keep auth implementation behind a reasonable abstraction so another provider could replace it later.

---

## Email

Use Resend for transactional email.

Initial email delivery should send the parent a message similar to:

```text
Emma's next Moonlight Forest adventure is here!

Episode #4
Pip and the Moonberry Mystery

[Open / Download Book]
```

Attaching the PDF is acceptable if size permits, but storing the PDF in R2 and providing a secure download link is also acceptable.

Choose the more robust implementation.

Emails must be automatic.

---

## AI

Use OpenAI initially for:

* episode planning
* story generation
* structured output
* story QA
* illustration briefs
* image generation
* visual QA if useful

Keep AI integrations behind interfaces.

Example:

```ts
interface StoryGenerator {
  generateOutline(...): Promise<StoryOutline>;
  generateManuscript(...): Promise<StoryManuscript>;
}

interface IllustrationGenerator {
  generate(...): Promise<GeneratedIllustration>;
}
```

We may replace image generation with another provider later.

Do not make OpenAI-specific response objects leak throughout the application.

---

## PDF generation

The actual book should first be represented as structured data + HTML/CSS.

Generate book pages using HTML/CSS.

Render HTML to PDF using Cloudflare Browser Rendering or the cleanest Cloudflare-compatible headless rendering method currently available.

Avoid manually drawing the entire PDF using coordinates.

We need to be able to create multiple rendering templates later:

```text
HOME_PRINT
PROFESSIONAL_PRINT
```

---

## Monitoring

Initially:

* structured logs
* useful error messages
* workflow status
* generation status
* delivery status

Add Sentry only if useful.

Do not build a huge observability stack.

---

# 6. Repository structure

Prefer a clean monorepo/single application.

Something conceptually like:

```text
src/
  app/
  components/
  routes/

  server/
    api/
    auth/
    db/

  domain/
    children/
    subscriptions/
    books/
    canon/
    universes/
    relationships/
    delivery/

  ai/
    story/
    illustrations/
    qa/

  workflows/
    generate-book.ts

  rendering/
    book-html/
    pdf/

  email/

drizzle/
migrations/

public/

wrangler.jsonc
drizzle.config.ts
vite.config.ts
package.json
.env.example
README.md
```

The exact organization can vary if you have a better clean structure.

Important principle:

Route handlers should not contain major business logic.

---

# 7. Core domain model

The key domain relationship is:

```text
User
  ↓
Child
  ↓
Subscription
  ↓
BookIssue
  ↓
Book
  ↓
Delivery
```

Canon/story state is associated with children/universes, NOT delivery.

---

# 8. Database schema

Design a clean normalized schema.

At minimum implement the following conceptual entities.

## users

```text
id
email
name
created_at
updated_at
```

Auth may require additional tables.

---

## children

```text
id
user_id
first_name
birth_date
reading_level nullable
created_at
updated_at
```

Do not collect unnecessary sensitive information.

Age should preferably be derived from birth date when appropriate.

---

## child_preferences

Could be columns, related tables, or structured JSON where appropriate.

Support:

```text
interests
favorite_character_ids
liked_themes
disliked_themes
optional_parent_notes
```

Keep frequently queried data relational where useful.

Do not shove the entire application's state into JSON.

---

## universes

```text
id
slug
name
description
active
created_at
updated_at
```

Seed:

```text
moonlight-forest
```

---

## characters

```text
id
universe_id
slug
name
description
personality
visual_description
canonical_reference_asset_ids if needed
active
created_at
updated_at
```

Seed:

```text
Milo
Pip
Juniper
Tuck
```

---

## locations

Persistent fictional locations.

```text
id
universe_id
name
description
canonical_properties
```

Examples:

```text
Pebble Bridge
Moonberry Hill
Whispering Creek
```

---

## products

A product defines what someone subscribes to.

Example:

```text
Moonlight Forest Monthly
```

Fields might include:

```text
id
slug
name
universe_id
frequency
active
```

Also model the delivery methods the product supports.

For MVP:

```text
EMAIL = enabled
MAIL = coming_soon
```

Do this cleanly rather than hardcoding it only in the UI.

---

## subscriptions

A subscription exists regardless of whether money is involved.

Fields:

```text
id
user_id
child_id
product_id

status
frequency

next_issue_at
last_issue_at nullable

created_at
updated_at
```

Status enum:

```text
ACTIVE
PAUSED
CANCELLED
```

Do NOT put Stripe-specific fields in the core domain.

Billing can be introduced later through a separate billing integration/model.

---

## subscription_delivery_methods

I prefer modeling delivery separately instead of assuming there can only ever be one.

Example:

```text
id
subscription_id
method
enabled
created_at
```

Method enum:

```text
EMAIL
MAIL
```

This allows a future physical subscription to deliver BOTH:

```text
EMAIL
MAIL
```

For MVP:

```text
EMAIL = enabled
MAIL = unavailable/coming soon
```

If a slightly different model is substantially cleaner, document why.

---

# 9. BookIssue vs Book

Keep the scheduled issue separate from its generated artifacts.

## book_issues

Conceptually:

```text
id
subscription_id
child_id
universe_id
episode_number

scheduled_for

status

created_at
generation_started_at nullable
ready_at nullable
delivered_at nullable
```

Status enum:

```text
SCHEDULED
GENERATING
QA
READY
DELIVERY_PENDING
DELIVERED
FAILED
```

This table represents:

**Emma is supposed to receive Moonlight Forest Episode #7.**

---

## books

The generated output associated with an issue.

Possible fields:

```text
id
book_issue_id
title
subtitle nullable
story_json
outline_json
generation_metadata
pdf_asset_id nullable
created_at
updated_at
```

Do not duplicate large image data in the database.

---

## book_pages

Prefer structured page representation.

Example:

```text
id
book_id
page_number
page_type
text
illustration_prompt
illustration_asset_id
metadata
```

Types could include:

```text
COVER
STORY
ENDING
COLLECTION
```

This allows us to regenerate rendering without regenerating the story.

---

# 10. Canon model

Continuity is fundamental.

Do not solve memory by simply stuffing every previous book into an LLM context window.

Maintain structured state.

Implement at least:

## canon_events

```text
id
universe_id
child_id nullable
book_issue_id nullable

event_type
summary

importance
occurred_at_story_time nullable

created_at
```

Some canon can be global:

```text
child_id = null
```

Some child-specific.

Examples:

```text
Pip learned that thunderstorms are not always dangerous.
```

```text
Emma's stories established that Juniper is her favorite recurring character.
```

```text
Milo and Pip discovered the hidden path near Moonberry Hill.
```

Episode generation should retrieve:

* world bible
* character bible
* child preferences
* recent episodes
* high-importance canon
* relevant historical canon

Do not require a vector database for MVP.

Start with structured retrieval using:

* recency
* entity association
* importance
* event type

Semantic retrieval can be added later if needed.

---

# 11. Episode summaries

Store a compact summary for every completed episode.

Example:

```text
Episode 6:
Milo and Pip searched for a missing lantern near Pebble Bridge.
Pip overcame his fear of entering a dark tunnel.
They discovered fireflies inside the tunnel.
```

The generation system should not need to read entire old manuscripts unless specifically necessary.

---

# 12. Future friendship schema

Create a schema that can cleanly support this later.

## relationships

Conceptually:

```text
id
child_a_id
child_b_id

status

created_by_user_id

created_at
accepted_at nullable
```

Status:

```text
PENDING
ACTIVE
REJECTED
REMOVED
```

Ensure uniqueness regardless of child ordering.

Do not expose one family's private information to another family simply because a relationship exists.

---

## shared_canon_events

Conceptually:

```text
id
relationship_id

event_type
summary
importance

source_book_issue_ids / associations

created_at
```

Example:

```text
Lumi and Bramble met at Pebble Bridge and found a golden acorn.
```

Future generation can retrieve shared canon when appropriate.

Do not implement full shared-story generation until the core individual system works.

---

# 13. Generation workflow

Implement a durable:

```text
GenerateBookWorkflow
```

Input should be minimal, ideally:

```ts
{
  bookIssueId: string
}
```

The workflow loads everything else itself.

The workflow should roughly perform:

```text
1. Load BookIssue
2. Load Subscription
3. Load Child
4. Load Universe
5. Load Characters
6. Load Preferences
7. Load recent episode summaries
8. Load relevant canon
9. Generate episode premise
10. Validate premise
11. Generate structured outline
12. Validate outline
13. Generate page-by-page manuscript
14. Validate manuscript
15. Generate illustration briefs
16. Generate illustrations
17. Run image/story QA
18. Render HTML
19. Generate PDF
20. Store PDF in R2
21. Mark book READY
22. Create delivery jobs
23. Deliver via enabled delivery methods
24. Mark delivery state
25. Write episode summary
26. Extract/update canon events
27. Update subscription next_issue_at
```

If needed, canon extraction may occur before delivery.

Be thoughtful about ordering so a failed email does not regenerate an entire story.

---

# 14. Structured AI output

Do not rely heavily on unstructured prose between generation stages.

Use schema-validated structured outputs.

Example outline:

```ts
type StoryOutline = {
  title: string;
  premise: string;

  featuredCharacterIds: string[];

  theme: string;

  continuityReferences: {
    canonEventId: string;
    purpose: string;
  }[];

  beats: {
    order: number;
    description: string;
  }[];
};
```

Example manuscript:

```ts
type StoryManuscript = {
  title: string;

  pages: {
    pageNumber: number;
    text: string;
    sceneDescription: string;
    charactersPresent: string[];
  }[];
};
```

Validate all AI responses before persisting them.

Retry malformed responses intelligently.

---

# 15. Story constraints

Initial target age:

approximately 3–5 years old.

Make this configurable.

The story should:

* be warm
* be fun to read aloud
* use simple language
* have clear narrative structure
* have emotional development
* avoid excessive exposition
* avoid preachiness
* avoid repetitive plots
* avoid bizarre AI randomness
* preserve character personalities
* preserve established canon
* remain age appropriate
* avoid unsafe content

The child does NOT necessarily appear literally inside the story.

Personalization should primarily influence:

* themes
* situations
* emotional lessons
* interests
* favorite recurring characters

Example parent note:

```text
Emma has started riding her scooter and gets frustrated when she falls.
```

Could inspire:

```text
Milo Tries One More Time
```

without literally inserting Emma into the fictional world.

---

# 16. Book format

For the email/self-print MVP, optimize for normal home printers.

Use US Letter:

```text
8.5 x 11 inches
```

with a booklet layout that can ultimately produce approximately:

```text
5.5 x 8.5 inches
```

when printed/folded.

The exact first printing UX can be simplified if booklet imposition becomes problematic.

The important requirements are:

* attractive PDF
* easy for a parent to print
* full-color
* readable
* approximately 8–12 story pages
* collectible-series feel

Target approximately:

```text
10–12 content pages
```

Include:

* cover
* story pages
* ending
* collection/episode page

The final page should reinforce continuity.

Example:

```text
Emma's Moonlight Forest

✓ Episode 1 — The Lost Kite
✓ Episode 2 — Pip's Big Jump
✓ Episode 3 — The Moonberry Mystery
✓ Episode 4 — Milo Tries Again

Episode 5 coming next month...
```

The child/parent should perceive these as numbered collectible episodes.

---

# 17. Illustration system

Character consistency matters.

Each character needs canonical visual specifications.

Store:

* species
* colors
* clothing/accessories
* proportions
* facial traits
* art-style rules
* reference images where supported

Image-generation prompts must include relevant canonical visual information.

Do not scatter character prompt strings throughout the codebase.

Create a central character-art representation.

The initial art style should feel like a polished modern children's picture book.

Do not imitate a living artist's exact style.

---

# 18. Quality assurance

Do not blindly email whatever the first model generates.

Implement automatic validation.

At minimum check:

## Story QA

* age appropriateness
* coherence
* no unsafe content
* character names correct
* featured characters actually exist
* continuity references valid
* no major contradiction with retrieved canon
* reasonable story length
* no accidental adult themes
* no obviously broken text
* no excessive repetition

## Illustration QA

Where practical:

* expected characters present
* illustration broadly matches page scene
* no obvious text inside generated image unless intentional
* no obviously unusable image-generation artifacts

Do not build an impossibly elaborate vision system for MVP.

Build a clean QA interface that can be extended.

---

# 19. Generation failure/retry strategy

Failures should be recoverable.

Example:

```text
Story complete
Images 1–5 complete
Image 6 fails
```

Do NOT restart the entire workflow.

Retry the failed image.

Similarly:

```text
Book generated
PDF generated
Email fails
```

Retry email delivery.

Do not regenerate story/images.

Use idempotency throughout.

---

# 20. Delivery abstraction

Create an interface similar to:

```ts
interface DeliveryProvider {
  method: DeliveryMethod;

  deliver(input: {
    subscription: Subscription;
    bookIssue: BookIssue;
    book: Book;
  }): Promise<DeliveryResult>;
}
```

Implement:

```text
EmailDeliveryProvider
```

now.

Create an intentional future extension point for:

```text
MailDeliveryProvider
```

but do NOT implement POD integration.

---

# 21. Deliveries table

Track individual attempts/outcomes.

Possible model:

```text
id
book_issue_id
subscription_id

method

status

provider
provider_reference nullable

attempt_count

last_error nullable

created_at
sent_at nullable
delivered_at nullable
```

Statuses might include:

```text
PENDING
PROCESSING
SENT
DELIVERED
FAILED
```

Email may only reliably support SENT rather than confirmed end-user reading.

That's okay.

---

# 22. Subscription frequency

Initial product:

```text
MONTHLY
```

Design frequency so future options could include:

```text
WEEKLY
BIWEEKLY
MONTHLY
```

Do not hardcode “30 days.”

Use proper schedule semantics.

For MVP, monthly behavior is sufficient.

---

# 23. Initial scheduling

When a user creates their first subscription, make the first issue available quickly.

Reasonable behavior:

```text
Subscription created
        ↓
Episode #1 created immediately
        ↓
GenerateBookWorkflow starts
```

After delivery:

```text
next_issue_at = next monthly issue date
```

Make scheduling deterministic and testable.

---

# 24. Parent onboarding UI

Build a polished but simple onboarding flow.

## Step 1

Parent account.

## Step 2

Child profile.

Collect only useful information:

```text
First name
Birth date / age
Interests
Favorite Moonlight Forest character
```

Potential interests:

```text
Animals
Dinosaurs
Vehicles
Space
Nature
Music
Building
Adventure
Pretend play
```

## Step 3

Optional personalization.

Prompt:

```text
Anything happening in your child's life that you would like a future story to draw inspiration from?
```

Make this optional.

Examples:

```text
Learning to ride a scooter.
Starting preschool.
Scared of thunderstorms.
New baby sibling.
Learning to share.
```

## Step 4

Subscription.

Show:

```text
Moonlight Forest
Monthly
Free Beta
```

Delivery:

```text
✓ Email — Free
Mail — Coming soon
```

## Step 5

Confirmation.

```text
Emma's first Moonlight Forest story is being created.
```

---

# 25. Parent dashboard

Dashboard should show:

```text
Children
Subscriptions
Book collection
Next story date
```

For a child:

```text
Emma
Age 4

Moonlight Forest
Active

Next story:
October 3

Collection:
Episode 1
Episode 2
Episode 3
```

Each completed book should have:

```text
View
Download PDF
```

---

# 26. Parent story input

Do NOT require a monthly questionnaire.

The product should work with zero repeated input.

Before a future issue, eventually we may email:

```text
Emma's next story is coming soon.

Want to inspire this month's adventure?
[Add something from Emma's week]
```

For MVP, build a place in the dashboard where parents can add/update optional story inspiration.

The generator should use it if present.

Do not block generation if absent.

---

# 27. Admin UI

Build a basic internal admin interface.

This is important during beta.

Admin should allow us to view:

* users
* children
* subscriptions
* BookIssues
* workflow state
* generated books
* delivery state
* generation failures

For an individual BookIssue, show:

```text
Child
Episode
Status
Story title
Outline
Pages
Images
QA result
PDF
Delivery status
Errors
```

Provide useful actions where reasonable:

```text
Retry failed workflow
Retry delivery
Regenerate failed image
```

Be careful not to accidentally create duplicate episodes.

---

# 28. Seed data

Create a useful seed/dev environment.

Seed:

## Universe

Moonlight Forest

## Characters

Milo
Adventurous bear.

Pip
Nervous but clever rabbit.

Juniper
Mischievous fox.

Tuck
Thoughtful turtle.

Expand each character into a usable character bible including:

* personality
* speech tendencies
* strengths
* weaknesses
* recurring behaviors
* relationship tendencies
* visual description

## Locations

Create several useful locations such as:

* Pebble Bridge
* Moonberry Hill
* Whispering Creek
* Firefly Hollow
* Old Oak Clearing

Create enough world detail for stories to feel consistent.

Keep this seed data editable.

---

# 29. Security/privacy

This involves children's information, so use conservative design.

Do NOT collect information we do not need.

Do NOT make children's profiles public.

Parents should only access their own children and subscriptions.

Friend relationships must eventually require consent from both families.

Never expose one family's private child profile data to another parent.

Use appropriate authorization checks server-side.

Do not rely on UI hiding for security.

Use secure R2 asset access for generated books rather than public predictable URLs where practical.

---

# 30. Environment configuration

Create `.env.example` / appropriate Wrangler configuration documenting required variables.

Examples:

```text
OPENAI_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
BETTER_AUTH_SECRET
APP_BASE_URL
```

Cloudflare bindings should be clearly documented.

Include:

* D1 binding
* R2 binding
* Workflow binding
* Browser Rendering binding if necessary

Never commit secrets.

---

# 31. Local development

Make local development straightforward.

README should explain:

```text
1. Install dependencies
2. Configure environment
3. Run migrations
4. Seed development database
5. Start local application
6. Test generation
7. Trigger a test book workflow
```

Provide useful scripts such as:

```text
npm run dev
npm run typecheck
npm run lint
npm run test
npm run db:migrate
npm run db:seed
```

Use the package manager you believe is appropriate; pnpm is preferred if there is no reason otherwise.

---

# 32. Testing

Write meaningful tests.

At minimum test:

## Domain logic

* subscription scheduling
* episode numbering
* duplicate BookIssue prevention
* delivery-method handling
* canon retrieval
* authorization boundaries

## AI parsing

* malformed structured output
* retries
* schema validation

## Workflow

Mock external services.

Test that:

```text
image failure
```

does not cause already-generated story stages to be unnecessarily rerun.

## API

Test important routes and authorization.

Do not waste time writing trivial tests for every React component.

---

# 33. Idempotency requirements

This is important.

The following must be safe if called more than once:

```text
cron scheduler
BookIssue creation
workflow start
email delivery retry
canon extraction
subscription next-date update
```

Use deterministic constraints/unique indexes where appropriate rather than relying only on application-level checks.

---

# 34. State machine

Define allowed BookIssue state transitions.

Do not allow arbitrary status strings.

Something like:

```text
SCHEDULED
    ↓
GENERATING
    ↓
QA
    ↓
READY
    ↓
DELIVERY_PENDING
    ↓
DELIVERED
```

Failure can occur during stages.

Document how retries work.

Do not build an enormous state-machine framework if normal domain logic is sufficient.

---

# 35. What NOT to build

Do NOT build:

* Stripe
* paid subscriptions
* taxes
* physical POD integration
* shipping tracking
* mobile apps
* Kubernetes
* Docker-based production infrastructure unless absolutely necessary
* microservices
* Kafka
* Temporal
* custom model hosting
* custom ML models
* vector database
* elaborate recommendation engine
* children's messaging
* public child profiles
* social feed
* complex friend crossover generation
* multiple story universes
* multiple age products
* multiple subscription tiers

The objective is to make the CORE LOOP excellent.

---

# 36. MVP success definition

The MVP is successful when this exact flow works:

```text
1. Parent signs up.

2. Parent creates:
   Emma
   age 4
   likes animals and scooters
   favorite character Juniper.

3. Parent subscribes Emma to:
   Moonlight Forest Monthly
   Free Beta
   Email delivery.

4. A BookIssue for Episode #1 is created.

5. GenerateBookWorkflow runs without manual intervention.

6. The system loads the Moonlight Forest canon.

7. The system generates a valid episode outline.

8. The system generates a coherent age-appropriate story.

9. The system generates consistent illustrations.

10. Automated QA passes or intelligently retries.

11. A polished printable PDF is created.

12. The PDF is stored in R2.

13. Emma's parent automatically receives the story through email.

14. The book appears in Emma's online collection.

15. The episode summary and relevant canon are persisted.

16. Emma's next BookIssue is scheduled for the following month.

17. When Episode #2 is generated, the story generator knows what happened in Episode #1.
```

That is the core product.

---

# 37. Architecture principle

Always optimize for:

```text
simple now
+
extensible later
```

rather than:

```text
minimal prototype that must be rewritten
```

or:

```text
enterprise architecture for a product with zero users
```

Examples:

GOOD:

```text
DeliveryProvider interface
Email provider implemented
Mail provider later
```

BAD:

```text
hardcoded resendEmail() throughout business logic
```

Also BAD:

```text
full enterprise plugin framework with dependency injection containers and 30 abstractions
```

Use judgment.

---

# 38. Development order

Build incrementally in this order.

## Phase 1 — Foundation

* project structure
* Cloudflare configuration
* D1
* Drizzle schema
* migrations
* R2
* authentication
* seed data

## Phase 2 — Core parent product

* child CRUD
* subscriptions
* product model
* dashboard
* delivery selection

## Phase 3 — Story engine

* world/character context
* canon retrieval
* episode planning
* manuscript generation
* structured validation
* episode summaries
* canon extraction

## Phase 4 — Illustration engine

* canonical character visual definitions
* illustration prompts
* image generation
* R2 storage
* retry behavior

## Phase 5 — Book renderer

* page representation
* HTML/CSS template
* printable layout
* PDF rendering
* PDF storage

## Phase 6 — Workflow

Wire all stages into `GenerateBookWorkflow`.

Ensure resumability/idempotency.

## Phase 7 — Delivery

* Resend
* email template
* secure book link/attachment
* deliveries table
* retry

## Phase 8 — Scheduling

* Cron Trigger
* due-subscription query
* BookIssue creation
* workflow trigger
* next issue scheduling

## Phase 9 — Admin / QA

* admin pages
* failures
* retries
* book previews
* workflow status

## Phase 10 — Testing/polish

* unit tests
* integration tests
* typecheck
* accessibility basics
* README
* deployment instructions

---

# 39. First development milestone

Before spending significant effort polishing the web application, ensure we can programmatically achieve:

```ts
await generateBook({
  childId: "emma"
});
```

and end with a real:

```text
book.pdf
```

containing:

* coherent story
* illustrations
* Moonlight Forest characters
* child-informed personalization
* numbered episode
* attractive layout

The content-generation/product-quality loop is more important than dashboard polish.

---

# 40. Code quality

Use:

* strict TypeScript
* explicit types at domain boundaries
* Zod or equivalent for runtime validation
* Drizzle migrations
* clean error types
* small cohesive modules
* dependency interfaces around external providers

Avoid:

* giant utility files
* 1,000-line route handlers
* untyped JSON everywhere
* premature generic frameworks
* unnecessary classes where functions suffice
* unnecessary abstraction layers

Document genuinely non-obvious architectural decisions.

---

# 41. AI prompt management

Do not scatter prompts inline throughout application code.

Create a structured prompt system.

For example:

```text
ai/prompts/
  episode-planner.ts
  manuscript.ts
  story-qa.ts
  illustration.ts
  canon-extraction.ts
```

Prompts should be versionable.

Persist useful generation metadata such as:

```text
model
prompt_version
created_at
```

so generation behavior can be debugged later.

Do not persist hidden chain-of-thought.

Only persist requested structured outputs/results.

---

# 42. Cost awareness

Keep the application cheap.

We expect early usage around:

```text
10 users
100 users
1,000 users
```

Avoid expensive unnecessary AI calls.

Prefer:

```text
one strong planning call
one manuscript call
one QA call
required image calls
```

rather than dozens of agents talking to each other.

Make model names/configuration configurable.

Track approximate generation usage/cost metadata where practical.

---

# 43. Feature flags / coming soon

MAIL should exist in the product model but currently be unavailable.

The UI should show something like:

```text
Delivery

● Email
  Receive a printable PDF automatically.

○ Mail
  Physical booklet delivered to your home.
  Coming soon.
```

Do not fake physical functionality.

Use a clean capability/availability representation rather than random UI conditionals.

---

# 44. Future billing readiness

Do not implement billing.

But maintain this conceptual separation:

```text
Subscription
≠
Billing Subscription
```

Eventually we may add:

```text
subscription_billing
billing_accounts
```

with:

```text
provider = STRIPE
provider_subscription_id
status
```

Do not put fake Stripe fields everywhere preemptively.

---

# 45. Future professional printing readiness

Book rendering should eventually support:

```ts
type BookRenderTarget =
  | "HOME_PRINT"
  | "PROFESSIONAL_PRINT";
```

Only `HOME_PRINT` needs implementation now.

Professional printing will likely require:

* square trim sizes
* bleed
* crop/trim rules
* CMYK considerations
* printer-specific PDF requirements

Do not implement those yet.

Just avoid tightly coupling story content to today's home-print dimensions.

---

# 46. Deliverables

At completion I expect:

1. Working application.
2. Complete source code.
3. D1/Drizzle schema.
4. Database migrations.
5. Development seed data.
6. Cloudflare configuration.
7. R2 integration.
8. GenerateBookWorkflow.
9. Story-generation implementation.
10. Illustration-generation implementation.
11. Canon implementation.
12. HTML book renderer.
13. PDF-generation implementation.
14. Resend email delivery.
15. Subscription scheduler.
16. Parent onboarding.
17. Parent dashboard.
18. Basic admin interface.
19. Automated tests.
20. `.env.example`.
21. Clear README.
22. Deployment instructions.
23. Architecture notes for future:

    * MAIL
    * Stripe
    * friendships
    * shared canon
    * crossover books

---

# 47. Working style

Work autonomously.

Do not repeatedly ask me to choose trivial implementation details.

If something is ambiguous:

1. choose the simplest sensible approach,
2. document the choice,
3. keep moving.

Do not merely produce an architecture document.

Actually implement the application.

At meaningful milestones:

* run tests
* run typecheck
* run lint
* inspect errors
* fix them

Do not leave core functionality as TODO comments or fake mock implementations unless an external credential is genuinely required.

Where credentials are required, create clean provider abstractions and make local/mock development possible.

---

# 48. Final priority

The application is not valuable because it can call an LLM.

The valuable behavior is:

```text
A child develops a persistent relationship with a fictional universe.

The universe remembers previous adventures.

A new physical-or-digital collectible episode arrives repeatedly.

Eventually real-life friends' fictional worlds can overlap.
```

Every technical decision should support that product.

For V0, focus relentlessly on making this loop work:

```text
SUBSCRIPTION
      ↓
PERSISTENT CANON
      ↓
GREAT STORY
      ↓
CONSISTENT ART
      ↓
PRINTABLE BOOK
      ↓
AUTOMATIC EMAIL DELIVERY
      ↓
NEXT EPISODE
```

Build that first.
