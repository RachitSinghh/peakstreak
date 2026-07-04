## **PeakStreak** Frontend Specification & Design System 

Version 2.0  ·  “Linear-style” dark visual language 

July 2026  ·  Design reference: Linear.app marketing + product surface language 

■ Dark canvas · single lavender accent · surface ladder · hairline borders 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 1 

## **Table of Contents** 

1. Introduction, Design Principles & Reference Source 

2. Color System 

3. Typography 

4. Spacing, Grid & Layout 

5. Elevation, Depth & Iconography 

6. Component Specifications 

- 6.1 Buttons 

- 6.2 Inputs & Form Controls 

- 6.3 Cards & Panels 

- 6.4 Modals & Dialogs 

- 6.5 Streak, Progress & Habit-Loop Components 

7. Do's and Don'ts 

8. Accessibility Standards 

9. Third-Party API & Integration Specification 

- 9.1 Google OAuth 2.0 (Sign-In + YouTube Scope) 

- 9.2 YouTube Data API v3 (Playlist Metadata) 

- 9.3 YouTube IFrame Player API (Watch-Time Tracking) 

- 9.4 Transactional Email Provider (Daily Reminders) 

- 9.5 Payments Provider (Stripe — Phase 2 Placeholder) 

10. Quota, Caching & Rate-Limit Strategy 

11. Design Token Reference (Appendix) 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 2 

## **1. Introduction, Design Principles & Reference Source** 

This document defines PeakStreak’s complete visual design system, restyled to match the visual language of Linear’s marketing and product surfaces — a near-black canvas, a single chromatic accent, and hierarchy carried entirely by a surface ladder and hairline borders rather than by color variety or drop shadows. It replaces the warm “flame” palette used in v1.0 of this spec. The API & integration contract in Section 9 is unchanged from v1.0. 

Note on this document’s own presentation: this spec is printed on a white page for readability/printability, but every color value, swatch, and component rule below describes the actual dark-canvas product UI — the app itself ships dark-only in v1, matching Linear’s own “no light-mode marketing page” rule extended here to the whole product, not just marketing. 

## **Design Principles (adapted from the Linear reference)** 

- One accent, used scarcely. Lavender-blue (#5E6AD2) is reserved for the brand mark, the primary CTA, focus rings, and link emphasis — never as a card fill or section background. The streak flame, previously ember-orange, is now rendered in lavender to keep the palette to a single chromatic accent, exactly as the reference doc prescribes. 

- Hierarchy by surface, not by shadow. Every elevated element (card, modal, dropdown) is a step up a fourlevel surface ladder (canvas → surface-1 → surface-2 → surface-3) with a 1px hairline border — not a box-shadow. 

- Content is the protagonist. In Linear, product screenshots dominate; in PeakStreak, the embedded YouTube player and the streak/contribution graph play that role — chrome recedes, data and video are what get visual weight. 

- Negative tracking on display type, calm default weight on body. Headlines sit at weight 600 with aggressive negative letter-spacing; body text stays at 400 — never bold-by-default. 

- Semantic color stays minimal and deliberate. Only success green is treated as a first-class semantic color, matching the reference. Streak-at-risk and destructive states use muted amber/red tag colors sparingly, borrowed from Linear’s own in-product tag palette (not its marketing palette) since PeakStreak is a product UI, not a marketing site. 

## **2. Color System** 

The palette is built on Linear’s exact documented values: a near-pure-black canvas with a faint blue tint, a four-step charcoal surface ladder, light-gray ink text at four levels of emphasis, and a single lavender-blue accent. Success green is the only additional semantic color carried over from the reference; two muted tag colors (amber, red) are added for PeakStreak’s own product states (streak risk, destructive actions) and used as sparingly as Linear uses its accent. 

## **2.1 Brand & Accent** 

|**Swatch**|**Token**|**Hex**|**Usage**|
|---|---|---|---|
|**Primary**<br>Lavender|color.primary|#5E6AD2|Brand mark, primary CTA, focus<br>rings, link emphasis — the only<br>chromatic accent|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 3 

|**Swatch**|**Token**|**Hex**|**Usage**|
|---|---|---|---|
|**Primary**<br>Hover|color.primary-hover|#828FFF|Hover state of the primary CTA|
|**Primary**<br>Focus|color.primary-focus|#5E69D1|Pressed CTA state; base for the<br>50%-opacity focus ring|
|**Brand**<br>Secure|color.brand-secure|#7A7FAD|Muted lavender-gray for account-<br>security / trust surfaces (OAuth<br>linking screen)|



## **2.2 Surface Ladder** 

|**Swatch**|**Token**|**Hex**|**Usage**|
|---|---|---|---|
|**Canvas**|color.canvas|#010102|Default app background — near-<br>pure black with a faint blue tint|
|**Surface**<br>1|color.surface-1|#0F1011|Default cards: playlist cards,<br>feature tiles, the video/notes panel<br>frame|
|**Surface**<br>2|color.surface-2|#141516|Hovered cards, the selected pace-<br>selector segment, featured/empty-<br>state panels|
|**Surface**<br>3|color.surface-3|#18191A|Dropdown menus, sub-nav,<br>context menus|
|**Surface**<br>4|color.surface-4|#191A1B|Deepest lifted surface — reserved<br>for modal-on-modal edge cases|
|**Hairline**|color.hairline|#23252A|Default 1px card/divider borders|
|**Hairline**<br>Strong|color.hairline-strong|#34343A|Input focus borders, featured-card<br>borders|
|**Hairline**<br>Tertiary|color.hairline-tertiary|#3E3E44|Borders on nested surfaces (e.g. a<br>card inside a modal)|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 4 

## **2.3 Text / Ink Scale** 

|**Swatch**|**Token**|**Hex**|**Usage**|
|---|---|---|---|
|**Ink**|color.ink|#F7F8F8|Headlines and primary body text|
|**Ink**<br>Muted|color.ink-muted|#D0D6E0|Secondary text — card metadata,<br>playlist stats row|
|**Ink**<br>Subtle|color.ink-subtle|#8A8F98|Tertiary text — deselected tabs,<br>placeholder text, footer links|
|**Ink**<br>Tertiary|color.ink-tertiary|#62666D|Disabled text, footnotes,<br>timestamps at rest|



## **2.4 Semantic Colors** 

|**Swatch**|**Token**|**Hex**|**Usage**|
|---|---|---|---|
|**Success**|color.success|#27A644|Playlist completed, note saved,<br>streak-freeze applied — the only<br>semantic color used on light-<br>touch confirmations, exactly as in<br>the reference|
|**Tag**<br>Amber|color.tag-amber|#D4A72C|Streak-at-risk banner, quota-<br>nearing-limit notice — a muted<br>product-tag color, not a marketing<br>accent|
|**Tag**<br>Red|color.tag-red|#D4574E|Destructive actions (delete<br>playlist), form validation errors,<br>streak broken|
|**Inverse**<br>Canvas|color.inverse-canvas|#FFFFFF|Reserved for the rare inverse CTA<br>(e.g. “Export notes” on the<br>completion screen)|



## **2.5 Usage Rules** 

- Lavender never becomes a section background or a card fill — it appears only on the brand mark, the primary CTA, focus rings, and link emphasis, per the reference doc’s explicit “Don’t use lavender as a section background or card fill” rule. 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 5 

- No atmospheric gradients, no spotlight cards, no second chromatic accent beyond the amber/red producttag exceptions in 2.4 — those two exist only because PeakStreak is a working product (streak risk, deletion) and not a marketing page, where Linear’s own rule would forbid them entirely. 

- Hierarchy is expressed by moving one level up the surface ladder (canvas → surface-1 → surface-2 → surface-3), never by introducing a shadow. Do not skip a level. 

- Contrast targets: Ink (#F7F8F8) on Canvas (#010102) exceeds 15:1; Ink-subtle (#8A8F98) on Surface-1 (#0F1011) is used only for de-emphasized/secondary text, never for body copy that must meet AA at small sizes — see Section 8. 

## **3. Typography** 

The scale below is copied directly from the Linear reference token-for-token. Linear’s custom “Linear Display” and “Linear Text” faces are proprietary; per the reference’s own substitution note, PeakStreak uses Inter (weights 400/500/600) as the cross-platform substitute for both, and JetBrains Mono in place of Linear Mono. On macOS, SF Pro Display may be used as a closer optional fallback for the display tiers. 

|**Token**|**Size**|**Weight**|**Line Height**|**Tracking**|**Use**|
|---|---|---|---|---|---|
|display-xl|80px|600|1.05|-3.0px|Largest hero<br>headline<br>(marketing<br>only)|
|display-lg|56px|600|1.10|-1.8px|Section<br>opener<br>headlines|
|display-md|40px|600|1.15|-1.0px|Sub-section<br>headlines,<br>empty-state<br>titles|
|headline|28px|600|1.20|-0.6px|Page titles —<br>Dashboard,<br>Playlist Detail|
|card-title|22px|500|1.25|-0.4px|Playlist card<br>title, modal<br>title|
|subhead|20px|400|1.40|-0.2px|Lead<br>paragraph on<br>estimate<br>result screen|
|body-lg|18px|400|1.50|-0.1px|Notes panel<br>lead text|
|body|16px|400|1.50|-0.05px|Default body<br>text, form<br>labels|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 6 

|**Token**|**Size**|**Weight**|**Line Height**|**Tracking**|**Use**|
|---|---|---|---|---|---|
|body-sm|14px|400|1.50|0|Card body<br>copy, footer<br>columns|
|caption|12px|400|1.40|0|Timestamps,<br>metadata,<br>status pills|
|button|14px|500|1.20|0|All button<br>labels|
|eyebrow|13px|500|1.30|+0.4px|Section<br>eyebrow /<br>category label<br>above a<br>heading|
|mono|13px|400|1.50|0|Streak<br>counter, video<br>timestamps,<br>countdown|



## **3.1 Font Stack (CSS)** 

```
--font-display: "Inter", "SF Pro Display", -apple-system, system-ui, sans-serif;
```

```
--font-text: "Inter", -apple-system, system-ui, sans-serif;
```

```
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

## **3.2 Rules** 

- Display and body are treated as one continuous voice — the family never visibly changes, only the weight and tracking do (600 at display, 400 at body). Never introduce a 700+ display weight. 

- Negative tracking is applied aggressively at large sizes (-3.0px at 80px) and eases toward 0 at body sizes — the eyebrow style is the one exception, carrying positive tracking (+0.4px) specifically to read as taxonomy/label rather than heading. 

- The streak counter (e.g. the “14” in a 14-day streak) renders in font-mono at minimum 20px: numerals stay in mono so digits don’t jitter as counts update, and mono is reserved for that kind of data display, never for prose — matching the reference’s “mono only in code/data contexts” rule. 

## **4. Spacing, Grid & Layout** 

Spacing tokens are copied directly from the reference (4px base unit). Button padding is 8px vertical × 14px horizontal — Linear’s compact spec — and form inputs use 8px × 12px, both applied exactly as documented. 

|**Token**|**Value**|**Typical Use**|
|---|---|---|
|space.xxs|4px|Icon-to-label gap, tight inline spacing|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 7 

|**Token**|**Value**|**Typical Use**|
|---|---|---|
|space.xs|8px|Button vertical padding, chip padding|
|space.sm|12px|Input padding, form field gap|
|space.md|16px|Default stack gap, card internal spacing (compact cards)|
|space.lg|24px|Card internal padding (default), gaps within a panel|
|space.xl|32px|Gap between major sections on a page|
|space.xxl|48px|CTA banner / completion-screen padding|
|space.section|96px|Vertical rhythm between full page sections on marketing/landing|



## **4.1 Grid & Breakpoints** 

|**Breakpoint**|**Width**|**Layout behavior**|
|---|---|---|
|Mobile|< 480px|Single column; display-xl scales 80px → ~36px; nav<br>collapses to hamburger|
|Mobile-Lg|480–768px|Single column; pricing/plan comparisons become<br>accordions|
|Tablet|768–1024px|Card grid 3-up → 2-up; video + notes stack vertically|
|Desktop|1024–1280px|Card grid 3-up maintained; video (65%) + notes (35%)<br>side-by-side|
|Desktop-XL|≥ 1440px|Default desktop layout; content capped and centered, no<br>extra columns|



## **4.2 Container & Grid Rules** 

- Max content width: 1280px, centered — identical to the reference’s marketing container width, reused for the app shell. 

- Dashboard playlist-card grid: 3-up desktop, 2-up tablet, 1-up mobile, matching the reference’s card-grid collapsing strategy exactly. 

- Touch targets: CTAs ≥40px tap height at all viewports; form inputs ≥44px on touch; segmented-control (pace selector) pills ≥36px, growing to ≥44px on touch — all copied from the reference’s touch-target rules. 

- The watch screen may exceed the 1280px cap up to 1600px so the embedded player gets maximum size, mirroring the reference’s “product screenshots span full content width — they’re the protagonist” principle. 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 8 

## **5. Elevation, Depth & Iconography** 

Depth is carried entirely by the surface ladder plus hairline borders — the reference brand “resists drop shadows on dark almost entirely,” and PeakStreak follows that rule with no exceptions in v2.0. 

## **5.1 Elevation Levels** 

|**Level**|**Treatment**|**Use**|
|---|---|---|
|0 — flat|No border, no shadow,<br>canvas background|Page background, hero/empty-state text, footer|
|1 — charcoal lift|Surface-1 background, 1px<br>hairline border|Default cards: playlist cards, feature tiles|
|2 — surface-2 lift|Surface-2 background, 1px<br>hairline-strong border|Hovered cards, selected segmented-control option|
|3 — surface-3 lift|Surface-3 background|Dropdowns, context menus, sub-nav|
|4 — focus ring|2px primary-focus outline at<br>50% opacity|Focused input, focused button, focused card (keyboard nav)|



## **5.2 Border Radius** 

|**Token**|**Value**|**Usage**|
|---|---|---|
|radius.xs|4px|Status badges, small chips|
|radius.sm|6px|Inline tags|
|radius.md|8px|All buttons, all form inputs — never pill-rounded|
|radius.lg|12px|Playlist cards, feature cards, modals|
|radius.xl|16px|The video-player panel — PeakStreak’s equivalent of Linear’s<br>product-screenshot tile|
|radius.xxl|24px|Oversized completion-screen CTA banner (rare)|
|radius.pill / full|9999px|Pace-selector segmented pills, status pills, avatar circles — never<br>CTAs|



## **5.3 Iconography** 

- Icon set: Lucide (outline, 1.5px stroke), unchanged from v1.0 — rendered in Ink or Ink-subtle depending on emphasis, never in a color outside the palette above. 

- Default icon size 20px inline with body text, 24px for standalone nav/action icons. 

- The streak flame remains the one custom (non-Lucide) glyph, but is now rendered in Primary lavender when active for the day, and Ink-tertiary outline when not yet earned — replacing the ember-orange flame from v1.0 so the palette holds to a single chromatic accent. 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 9 

## **6. Component Specifications** 

## **6.1 Buttons** 

Four variants, copied directly from the reference’s button set. All buttons use radius.md (8px) — never pillrounded, per the reference’s explicit “Don’t pill-round CTAs” rule — and share the same 8px × 14px padding and button typography (14px / 500 / 0 tracking). 

|**Variant**|**Background / Text**|**Hover / Pressed**|**Usage**|
|---|---|---|---|
|Primary|Primary lavender bg / White text|Hover: primary-hover<br>(#828FFF). Pressed:<br>primary-focus (#5E69D1)|Main CTA per screen (Add<br>Playlist, Continue, Mark<br>Complete)|
|Secondary|Surface-1 bg / Ink text, 1px<br>hairline border|Hover: shift to surface-2 bg|Secondary actions (Edit pace,<br>Cancel, “Sign in”)|
|Tertiary|Canvas bg / Ink text, no border|Hover: ink-muted text|Plain-text / low-emphasis<br>actions (View notes, Skip)|
|Inverse|White bg / Black text|Hover: inverse-surface-1<br>(#F5F6F6)|Rare inverse CTA — e.g.<br>“Export notes” on the<br>completion screen|



## **Destructive Action** 

There is no dedicated “danger button” variant in the reference — destructive intent (Delete playlist) is expressed by pairing the Secondary button style with tag-red (#D4574E) text and border instead of a fully redfilled button, keeping the surface ladder intact and reserving solid color fills for the single lavender accent only. 

**Sizing & States** 

|**Size**|**Padding / Height**|**Notes**|
|---|---|---|
|sm|6px 12px / 32px|Inline table/list actions, status-pill-adjacent buttons|
|md (default)|8px 14px / 40px|Standard form and card actions — the reference’s exact<br>spec|
|lg|12px 20px / 48px|Primary page-level CTA (Add Playlist on empty state)|



Disabled state: surface-1 bg, ink-tertiary text, no pointer events. Focus state: 2px primary-focus outline at 50% opacity, offset 2px — elevation level 4 in Section 5.1, required for keyboard navigation and never removed. 

## **6.2 Inputs & Form Controls** 

Covers the playlist-URL paste field, pace selector, notes textarea, and auth/settings forms — spec copied from the reference’s text-input / text-input-focused tokens. 

|**Property**|**Spec**|
|---|---|
|Height|40px (single-line, 8px×12px padding), min-height 120px for notes textarea, auto-growing|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 10 

|**Property**|**Spec**|
|---|---|
|Padding|8px vertical, 12px horizontal — the reference’s exact form-input spec|
|Background|Surface-1 (#0F1011), no visible border at rest beyond a 1px hairline|
|Default text|Body (16px/400), Ink; placeholder in Ink-subtle|
|Focused state|Background stays surface-1; a 2px primary-focus outline at 50% opacity appears — the<br>field itself does not change color, only the ring appears, per the reference’s text-input-<br>focused spec|
|Error state|1px tag-red border, helper text below in tag-red, caption size, with an inline warning icon|
|Disabled|Surface-1 bg unchanged, text drops to ink-tertiary, no focus ring on interaction|
|Notes autosave indicator|Caption-style label bottom-right of the textarea: “Saved” in Success green, fades out after<br>2s|



## **Pace Selector (segmented pill control)** 

- Rendered as a 3-option pill toggle — the same shape as the reference’s pricing-tab component: “30 min/day” / “1 video/day” / “Custom.” 

- Default (unselected) segment: canvas background, ink-subtle text, radius.pill, 6px×14px padding — matches pricing-tab-default exactly. 

- Selected segment: surface-2 background, ink text — selected state is expressed purely as a surface lift, matching pricing-tab-selected. 

- “Custom” reveals an inline numeric input (font-mono) with a minutes-per-day stepper. 

## **6.3 Cards & Panels** 

The playlist card is PeakStreak’s equivalent of the reference’s feature-card / product-screenshot-card — the single most-viewed component in the product. 

|**Property**|**Spec**|
|---|---|
|Surface|Surface-1 background, 1px hairline border, radius.lg (12px). No box-shadow at any state.|
|Hover|Lift to surface-2 background and hairline-strong border — elevation level 2, never a<br>shadow|
|Padding|24px (space.lg) — the reference’s default card interior padding|
|Thumbnail|16:9 playlist thumbnail (from YouTube Data API), top-rounded to match card radius|
|Title|card-title style (22px/500/-0.4px), Ink, truncated to 2 lines with ellipsis|
|Progress bar|4px height, radius.full track in surface-2, fill in Primary lavender, animates width on<br>update|
|Metadata row|body-sm style, Ink-muted: “12 / 42 videos · Est. finish Aug 14”|
|Streak flame badge|Top-right corner overlay, 28px, filled Primary lavender if watched today, Ink-tertiary<br>outline if not|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 11 

|**Property**|**Spec**|
|---|---|
|Primary action|Full-width Primary button “Continue” pinned to card bottom|



## **Video / Notes Panel — the “product screenshot” equivalent** 

- The embedded YouTube player sits in a radius.xl (16px) surface-1 panel with 24px outer padding — directly mirroring the reference’s product-screenshot-card treatment, since this panel is PeakStreak’s protagonist element the way UI screenshots are Linear’s. 

- The notes panel beside it is a plain surface-1 panel at radius.lg (12px), separated from the video panel by a hairline border rather than a gap-only split, so the two panels read as one cohesive charcoal surface. 

## **6.4 Modals & Dialogs** 

|**Property**|**Spec**|
|---|---|
|Overlay|Pure black (#000000) scrim — the reference’s semantic-overlay token — at 60% opacity;<br>click-outside closes non-destructive modals only|
|Surface|Surface-2 background (one lift above cards, per elevation level 2), 1px hairline-strong<br>border, radius.lg (12px), max-width 480px (sm) / 640px (md)|
|Padding|24px (space.lg)|
|Header|card-title style + Tertiary-style close (X) icon button top-right|
|Footer actions|Right-aligned, Secondary button then Primary button, 12px gap|
|Confirmation modals|Used for: delete playlist, break a streak intentionally, disconnect Google account — the<br>confirm action uses the Secondary+tag-red treatment from 6.1, never a solid-red-filled<br>button|
|Animation|Scale-in from 0.96 → 1.0 + fade, 150ms ease-out; overlay fades in 100ms|



## **6.5 Streak, Progress & Habit-Loop Components** 

These components don’t exist in the reference — they’re PeakStreak-specific — but are restyled here to obey the reference’s rules: one chromatic accent, surface ladder for hierarchy, hairline borders, no gradients. 

## **Streak Counter** 

- Large numeral in font-mono, 28px (headline size), Primary lavender, with a flame glyph to its left; label “day streak” beneath in caption style, Ink-subtle. 

- When a freeze token is available, a small snowflake icon badge appears next to the counter using the status-badge component (surface-2 bg, ink-muted text, pill radius, 2px×8px padding) with a tooltip: “1 streak freeze available.” 

## **Contribution / Activity Graph** 

- GitHub-style heatmap grid, 7 rows (days) × up to 53 columns (weeks); cell size 12px with 3px gap, sitting on a surface-1 panel. 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 12 

- Cell fill scale: surface-1 (no activity) → a 3-step lavender-opacity ramp (25% → 55% → 100% of Primary) for increasing activity — replacing the prior mint/ember two-hue scale with a single-hue ramp, consistent with the “one accent” rule. 

- Hover/tap on a cell shows a tooltip in the surface-3 dropdown style: date + videos watched + minutes. 

## **Streak-at-Risk Banner** 

- Appears on the dashboard after the user’s configured local reminder time if no activity yet today; tagamber left border (4px) on a surface-1 card, calm/encouraging copy in Ink, never solid-red fill. 

## **Estimate Result Screen** 

- Large stat row (font-mono) showing total videos, total runtime, and estimated finish date side by side on a surface-1 panel, each with a caption label beneath — mirrors the reference’s dense, data-forward productscreenshot rhythm rather than a marketing-style hero. 

## **7. Do's and Don'ts** 

Carried over directly from the reference doc’s own “Do’s and Don’ts” section, applied to PeakStreak. 

## **Do** 

- Reserve Canvas (#010102) as the system’s anchor surface — the faint blue tint is intentional, keep it. 

- Use Primary lavender ONLY for: brand mark, primary CTA, focus ring, link emphasis, and the streak flame (PeakStreak’s one deliberate extension of the rule). 

- Use the four-step surface ladder for hierarchy. Avoid skipping levels. 

- Pair display weight 600 with body weight 400 — resist 700+ display weights. 

- Apply negative letter-spacing aggressively on display type. 

- Let the video player and progress visualizations be the protagonist of every core screen, the way product UI screenshots are the reference’s protagonist. 

- Compose CTAs with radius.md 8px corners. 

## **Don't** 

- Don’t ship a light-mode variant of the app — v1 is dark-only, full stop. 

- Don’t use lavender as a section background or card fill. 

- Don’t introduce a third chromatic accent beyond lavender, success green, and the two muted product tagcolors (amber, red) defined in Section 2.4. 

- Don’t add atmospheric gradients or spotlight cards. 

- Don’t pill-round CTAs. 

- Don’t use true black #000000 as the canvas — use #010102. 

- Don’t combine multiple bright accents inside a single card or panel. 

## **8. Accessibility Standards** 

- Target WCAG 2.1 AA across the product, unchanged from v1.0. 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 13 

- Color contrast on the dark canvas: Ink (#F7F8F8) on Canvas (#010102) exceeds 15:1; Ink-muted and Inksubtle are reserved for secondary/tertiary text only and are checked against whichever surface they sit on (surface-1 through surface-3), never assumed safe by default. 

- Primary lavender (#5E6AD2) on Canvas is ≈ 5.9:1 — sufficient for button text at 14px/500, but lavender is never used as small body text on its own, only as a fill with white text or as an outline/ring. 

- All interactive elements retain a visible focus-visible state (2px primary-focus outline at 50% opacity) and are reachable via keyboard in logical tab order — unchanged from v1.0, now expressed with the new token. 

- The embedded YouTube IFrame player retains its native captions/keyboard controls; PeakStreak chrome does not intercept player keyboard shortcuts. 

- Streak-loss and reminder copy avoids shame-based language, and now additionally avoids relying on color alone (amber/red) to signal risk — icon + text label always accompany the tag-amber/tag-red states for users with color-vision deficiencies. 

- Motion (progress bar fills, modal scale-in, activity-graph hover) respects prefers-reduced-motion by swapping to instant/opacity-only transitions. 

## **9. Third-Party API & Integration Specification** 

This section is unchanged in substance from Frontend Specification v1.0 — the restyle in this document is purely visual (Sections 1–8); the integration contract below still governs engineering work. PeakStreak integrates with four external services for v1, plus one placeholder integration (Stripe) that is scaffolded but not activated until Phase 2 per the PRD's non-goals. 

## **9.1 Google OAuth 2.0 — Sign-In + YouTube Read Scope** 

Purpose: user authentication, and — by requesting the YouTube read-only scope during the same consent flow — authorization to call the YouTube Data API on the user’s behalf without a separate connect step. 

## **Endpoints** 

|**Step**|**Endpoint**|**Purpose**|
|---|---|---|
|1. Authorize|GET<br>https://accounts.google.com/o/oauth2/<br>v2/auth|Redirect user to Google consent screen|
|2. Token exchange|POST<br>https://oauth2.googleapis.com/token|Exchange authorization code for access + refresh<br>tokens|
|3. Refresh|POST<br>https://oauth2.googleapis.com/token|Refresh an expired access token using the refresh<br>token|
|4. Userinfo|GET<br>https://openidconnect.googleapis.com<br>/v1/userinfo|Fetch profile (name, email, avatar) after login|



## **Request — Step 1 (query params on redirect)** 

```
client_id=<CLIENT_ID>
```

```
redirect_uri=https://peakstreak.app/auth/callback
```

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 14 

```
response_type=code
```

```
scope=openid email profile https://www.googleapis.com/auth/youtube.readonly
```

```
access_type=offline
```

```
prompt=consent
```

## **Request — Step 2 (token exchange body, application/x-www-form-urlencoded)** 

```
code=<AUTH_CODE>&client_id=<ID>&client_secret=<SECRET>&
```

```
redirect_uri=https://peakstreak.app/auth/callback&grant_type=authorization_code
```

## **Expected Response — Step 2** 

```
{ "access_token": "ya29....", "expires_in": 3599,
```

```
  "refresh_token": "1//0g...", "scope": "...", "token_type": "Bearer",
  "id_token": "eyJ..." }
```

## **Frontend / State Handling** 

- Store access_token in memory + short-lived httpOnly cookie via backend session; never expose refresh_token to client JS. 

- On 401 from any downstream API call, trigger the Step 3 refresh flow silently; only show a “Reconnect Google account” modal (styled per Section 6.4) if refresh itself fails (refresh_token revoked). 

- The consent screen copy shown to the user should explain the YouTube scope plainly: “We use this only to read playlist titles, thumbnails and durations — never to post, comment, or modify anything on your account.” 

## **9.2 YouTube Data API v3 — Playlist Metadata** 

Purpose: resolve a pasted playlist URL into a full video list with durations, used to compute the time estimate (Feature 1) and to populate the dashboard progress card. 

## **Endpoints** 

|**Call**|**Endpoint**|**Purpose**|
|---|---|---|
|Playlist info|GET /youtube/v3/playlists?<br>part=snippet,contentDetails|Title, thumbnail, and itemCount for the pasted<br>playlist ID|
|Playlist items|GET /youtube/v3/playlistItems?<br>part=snippet,contentDetails|Ordered list of video IDs in the playlist (paginated,<br>50/page)|
|Video durations|GET /youtube/v3/videos?<br>part=contentDetails,snippet|Batch lookup (up to 50 IDs) of ISO-8601 duration<br>per video|



## **Base URL** 

```
https://www.googleapis.com/youtube/v3/
```

## **Request — Playlist Info** 

```
GET /playlists?part=snippet,contentDetails&id={playlistId}&key={API_KEY}
Header: Authorization: Bearer {user_access_token}
```

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 15 

## **Expected Response — Playlist Info (trimmed)** 

```
{ "items": [{ "id": "PL...",
```

```
  "snippet": { "title": "100 Days of Code", "thumbnails": {"high": {"url":
"..."}}},
```

```
  "contentDetails": { "itemCount": 42 } }] }
```

## **Request — Playlist Items (paginated)** 

```
GET /playlistItems?part=contentDetails&playlistId={playlistId}
```

```
&maxResults=50&pageToken={nextPageToken}&key={API_KEY}
```

## **Expected Response — Playlist Items (trimmed)** 

```
{ "nextPageToken": "CAUQAA", "items": [{ "contentDetails": { "videoId":
"abc123" }}] }
```

## **Request — Video Durations (batched, comma-joined IDs)** 

```
GET /videos?part=contentDetails,snippet&id={id1,id2,...id50}&key={API_KEY}
```

## **Expected Response — Video Durations (trimmed)** 

```
{ "items": [{ "id": "abc123", "snippet": {"title": "Day 1: Setup"},
```

```
  "contentDetails": { "duration": "PT14M32S" } }] }
```

## **Frontend Handling Notes** 

- Duration strings are ISO-8601 (e.g. PT14M32S) — parse to seconds client-side or in the API layer before summing for the estimate screen. 

- For playlists > 50 videos, the frontend estimate screen should show a progressive loading state (“Fetching video 50 of 128...”, set in font-mono to match the reference’s data-display convention) while pagination completes, rather than blocking on the full result. 

- Cache playlist metadata + durations server-side (see Section 10) — do not re-fetch on every dashboard load, only on “Add playlist” and a manual “Refresh” action. 

## **9.3 YouTube IFrame Player API — Watch-Time Tracking** 

Purpose: power the in-app watch screen and determine when a video crosses the 80% watch-time threshold used for streak/completion logic. This is a client-side JS API, not a REST endpoint — it is loaded as a script and controlled via a JS object, not fetch/axios calls. 

## **Integration** 

```
<script src="https://www.youtube.com/iframe_api"></script>
```

```
player = new YT.Player('player-div', {
  videoId: '<videoId>',
  events: { onReady, onStateChange }
```

```
});
```

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 16 

## **Events & Methods Used** 

|**Event / Method**|**Usage in PeakStreak**|
|---|---|
|onStateChange (PLAYING)|Start a 5-second polling interval calling getCurrentTime()|
|getCurrentTime()|Polled to build a watched-seconds accumulator (ignores seeks-ahead so skipping<br>doesn’t inflate progress)|
|getDuration()|Denominator for the 80% threshold calculation|
|getPlaybackRate()|Logged alongside progress for future Phase 2 engagement scoring; not used to gate<br>completion in v1|
|onStateChange (ENDED)|Force-marks video complete regardless of accumulated watch-time|
|onStateChange (PAUSED)|Pauses the polling interval and flushes accumulated progress to the backend|



## **Data Sent to Backend** 

The frontend batches progress and POSTs it to PeakStreak’s own API (not YouTube’s) every ~15 seconds and on pause/unload: 

```
POST /api/progress  { "videoId": "abc123", "watchedSeconds": 412,
```

```
  "duration": 512, "playbackRate": 1.0, "clientTimestamp": "2026-07-
05T10:22:00Z" }
```

## **Expected Response** 

```
{ "thresholdMet": true, "streakUpdated": true, "currentStreak": 15 }
```

## **Frontend Handling Notes** 

- The 80% threshold check happens server-side (source of truth) so a user can’t spoof completion by editing client JS; the client only sends raw watched-seconds samples. 

- On thresholdMet: true, trigger the flame-lighting micro-animation on the streak counter (now lavender, per Section 6.5) immediately, optimistically, before waiting on any further network round trip. 

- No YouTube ToS-restricted data (e.g. ad-block detection, view-count manipulation) is read or written — only the public Player API surface listed above. 

## **9.4 Transactional Email Provider — Daily Reminders (Postmark)** 

Purpose: sends the daily “your streak is about to cool down” email. Postmark is used here as the reference provider; SES is an acceptable substitute with an equivalent contract. 

## **Endpoint** 

```
POST https://api.postmarkapp.com/email
```

```
Header: X-Postmark-Server-Token: {SERVER_TOKEN}
```

## **Request Body** 

```
{ "From": "streaks@peakstreak.app", "To": "{user_email}",
```

```
  "TemplateAlias": "streak-reminder",
```

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 17 

```
  "TemplateModel": { "firstName": "Asha", "playlistName": "100 Days of Code",
```

```
    "currentStreak": 14, "resumeUrl": "https://peakstreak.app/watch/abc123",
```

```
    "hoursUntilReset": 3 },
```

```
  "MessageStream": "streak-reminders" }
```

## **Expected Response** 

```
{ "To": "user@example.com", "SubmittedAt": "2026-07-05T18:00:00Z",
```

```
  "MessageID": "b7bc2f4a-...", "ErrorCode": 0, "Message": "OK" }
```

## **Frontend / Product Handling Notes** 

- This is a backend-triggered send (cron/scheduler), not a client-side call — the frontend’s only responsibility is exposing notification preferences (reminder time, unsubscribe) in Settings, styled per Sections 6.1–6.2. 

- The HTML email template itself should echo the product’s dark canvas + lavender accent so the reminder feels visually continuous with the app, with a single lavender “Continue watching” button (buttonprimary spec from 6.1). 

- Every template includes a one-click unsubscribe link (Postmark List-Unsubscribe header). 

- Bounce/spam-complaint webhooks from Postmark should suppress further sends to that address — surfaced to the user as a tag-amber banner (“Reminder emails paused — update your email”) if it happens. 

## **9.5 Payments Provider — Stripe (Phase 2 Placeholder, Not Active in v1)** 

Billing infrastructure is explicitly out of scope for v1. It is documented here only so the frontend leaves the correct integration seam — do not build any checkout UI now. 

|**Property**|**Spec**|
|---|---|
|Planned endpoint|POST https://api.stripe.com/v1/checkout/sessions (server-side only, via Stripe SDK)|
|Frontend seam|A single disabled Tertiary-style “Upgrade” menu item in Settings is acceptable as a<br>placeholder; it must not open any modal or call any endpoint in v1|
|Data that would be sent|price ID, customer email, success/cancel redirect URLs — no card data ever touches<br>PeakStreak servers (Stripe Checkout hosted page)|
|Status|Not in v1 — revisit after MVP retention metrics validate the core loop|



## **10. Quota, Caching & Rate-Limit Strategy** 

Unchanged in substance from v1.0. The YouTube Data API has a default daily quota (10,000 units/day per project); playlist and video list calls cost 1 unit per call but pagination and per-playlist refreshes add up quickly at scale, so caching is a day-one requirement, not an optimization. 

- Cache resolved playlist metadata (title, thumbnail, per-video durations) server-side, keyed by playlistId, with a 24h TTL — most educational playlists don’t change after publishing. 

- A manual “Refresh playlist” action in the UI (Tertiary button, per 6.1) bypasses cache but is rate-limited to once per hour per playlist per user to prevent quota exhaustion from repeated taps. 

PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 18 

- Google OAuth access tokens are refreshed proactively 5 minutes before expiry rather than reactively on 401, to avoid a visible loading stall on the dashboard. 

- Progress POSTs (Section 9.3) are batched client-side (15s intervals) rather than sent on every getCurrentTime() poll, to keep PeakStreak’s own API load and the user’s data usage reasonable. 

- Email sends (Section 9.4) are queued and rate-limited per Postmark’s sending limits; the scheduler staggers sends across each user’s local evening window rather than firing all reminders at one global UTC time. 

## **11. Design Token Reference (Appendix)** 

A flat reference of every token defined in this document, matched directly to the Linear reference’s own token names where applicable. 

|**Token**|**Value**|**Category**|
|---|---|---|
|color.primary|#5E6AD2|Color|
|color.primary-hover|#828FFF|Color|
|color.primary-focus|#5E69D1|Color|
|color.brand-secure|#7A7FAD|Color|
|color.canvas|#010102|Color|
|color.surface-1|#0F1011|Color|
|color.surface-2|#141516|Color|
|color.surface-3|#18191A|Color|
|color.surface-4|#191A1B|Color|
|color.hairline|#23252A|Color|
|color.hairline-strong|#34343A|Color|
|color.hairline-tertiary|#3E3E44|Color|
|color.ink|#F7F8F8|Color|
|color.ink-muted|#D0D6E0|Color|
|color.ink-subtle|#8A8F98|Color|
|color.ink-tertiary|#62666D|Color|
|color.success|#27A644|Color|
|color.tag-amber|#D4A72C|Color|
|color.tag-red|#D4574E|Color|
|font.display / text|Inter (sub for Linear|Typography|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 19 

|**Token**|**Value**|**Category**|
|---|---|---|
||Display/Text)||
|font.mono|JetBrains Mono (sub for Linear<br>Mono)|Typography|
|space.xxs – space.section|4 / 8 / 12 / 16 / 24 / 32 / 48 / 96px|Spacing|
|radius.xs / sm / md / lg / xl / xxl /<br>pill|4 / 6 / 8 / 12 / 16 / 24 / 9999px|Radius|
|elevation.0–4|flat / surface-1 / surface-2 /<br>surface-3 / focus ring|Elevation|



PeakStreak — Frontend Specification v2.0 (Linear-style)   |   Page 20 

