# 9Router Visual and UX Audit

**Audit date:** 2026-08-03  
**Target:** local `http://localhost:20128`  
**Scope:** dashboard shell, endpoint/key, providers, basic chat, responsive behavior, shared tokens/components, landing-page code, accessibility and motion implementation.

## Executive Summary

The application has a coherent operational dashboard direction: warm coral branding, semantic light/dark tokens, a skip link, landmark structure, accessible page headings, and responsive navigation controls. The dashboard is usable for core inspection and configuration workflows.

The main quality risk is systemic accessibility drift between the token/component intent and rendered controls. Lighthouse measured **83 accessibility on the desktop endpoint page** and **96 on the mobile basic-chat page**. The failures are not cosmetic: unnamed switches, an unlabeled endpoint field, and several AA contrast failures affect discoverability and state comprehension for keyboard and screen-reader users.

### Severity totals

- **Critical:** 0 observed
- **High:** 3
- **Medium:** 5
- **Low:** 4
- **Unverified:** live provider-dependent flows, authentication failure recovery, cross-browser rendering, real network error states

### Highest-return actions

1. Give every switch and icon-only command a user-facing accessible name, and associate labels with all form controls.
2. Split the coral token into separate control-fill and accent-text roles; the current shared `--color-primary` cannot pass both use cases by design.
3. Implement and verify a reduced-motion policy for the app and landing page.
4. Make mobile navigation state explicit in the DOM and verify focus return, Escape, and inertness when the drawer is open.
5. Add a small interaction regression suite covering the model picker, navigation drawer, theme/language menus, switches, dialogs, and chat composer.

## Evidence and Method

### Directly observed

- Browser accessibility snapshots at `/dashboard`, `/dashboard/providers`, and `/dashboard/basic-chat`.
- Chrome Lighthouse 13.4 snapshot audits on desktop and mobile.
- DOM/runtime measurements at desktop and 390px-width emulation.
- Keyboard-visible focus state after opening the model picker and changing theme.
- Static inspection of `src/app/globals.css`, shared `Header`/`Toggle` components, dashboard pages, and `BasicChatPageClient.js`.

### Lighthouse results

| Page and mode | Accessibility | Best practices | SEO | Failed audits |
|---|---:|---:|---:|---:|
| `/dashboard` desktop snapshot | 83 | 100 | 100 | 4 audit families |
| `/dashboard/basic-chat` mobile snapshot | 96 | 100 | 100 | 1 audit family |

Lighthouse is treated as evidence, not as the conclusion. The desktop failures were verified against rendered nodes and source patterns below. The mobile score is higher because the mobile view hides the sidebar visually; it does not demonstrate that all desktop issues are fixed.

### External standards used

- WCAG 2.2 SC 1.4.3, Contrast (Minimum): normal text requires 4.5:1; Lighthouse reported 2.63, 3.23, 3.81, 4.38, and 4.39 ratios on rendered nodes.
- WCAG 2.2 SC 1.3.1 and 4.1.2: controls need programmatic relationships and name/role/value.
- WCAG 2.2 SC 2.3.3 / media-query guidance: non-essential motion should honor `prefers-reduced-motion`.
- WCAG 2.2 SC 2.4.7 / 2.4.11: keyboard focus must remain visible and sufficiently distinguishable.

## Findings by Severity

### High H1: Shared switches have no accessible name

**Evidence:** Lighthouse `button-name` failed on the rendered `role="switch"` controls for “Require API key” and an API-key row. The DOM snippets are buttons with `role="switch"` and `aria-checked`, but no `aria-label`, `aria-labelledby`, or visible text. The shared implementation is `src/shared/components/Toggle.js:34-35`.

**Impact:** A screen reader announces a generic switch without identifying what it changes. This blocks safe configuration and makes state changes ambiguous. It affects endpoint security settings, provider enablement, and every other consumer of the shared Toggle.

**Root cause:** The component models state (`role`, `aria-checked`) but does not accept or derive the semantic label. Visual proximity to nearby text is not a programmatic association.

**Applicable principles:**

- **Mental models:** the user can see a label, but assistive technology cannot reliably connect it to the switch.
- **Law of Proximity:** visual proximity helps sighted users but cannot substitute for semantic association.
- **Poka-yoke:** the component API should require a label so future usages cannot omit it.

**Recommendation:** Require `label` or `ariaLabel` in `Toggle`; prefer `aria-labelledby` pointing at a stable visible label id. Keep `aria-checked`, add `type="button"`, and test both checked states. Use the same contract in provider cards and endpoint settings.

**Priority:** Immediate. **Confidence:** High. **Expected benefit:** removes a cross-application accessibility defect with one shared-component fix.

### High H2: Primary coral is reused as text and filled-button color

**Evidence:** `src/app/globals.css:32-33,120-125` explicitly maps `--color-primary` to `--color-brand-500` for both semantic accent text and filled controls. The comment acknowledges the trade-off: the value passes white text on a filled button but fails as text on a dark background. Lighthouse verified rendered failures including coral text at **2.63:1**, white text on coral fill at **3.23:1**, and pink Donate text at **3.81:1**.

**Impact:** Navigation state, action labels, and compact status labels are harder to read for low-vision users and users in glare or low-quality displays. The active navigation item is especially important because it carries orientation.

**Root cause:** One token is doing two incompatible jobs. The source comment recognizes this but leaves the split unresolved.

**Applicable principles:**

- **Selective attention:** low-contrast active-state signals compete with the page content precisely where orientation should be strongest.
- **Serial position / wayfinding:** persistent navigation needs dependable state cues.
- **Aesthetic-Usability Effect trade-off:** preserving the coral brand is reasonable, but visual identity cannot outrank readable state communication.

**Recommendation:** Introduce separate semantic roles such as `--color-accent-text`, `--color-primary-fill`, and `--color-primary-fill-foreground`. Recalculate both light and dark values against actual surfaces. Add automated contrast checks for representative combinations, not only raw palette values.

**Priority:** Immediate. **Confidence:** High. **Expected benefit:** fixes many findings without changing information architecture.

### High H3: Mobile navigation accessibility state is not proven to match visual state

**Evidence:** At the narrow viewport the accessibility tree exposed the full complementary sidebar and its entire navigation list while also exposing an expanded “Open navigation menu” button. At desktop the sidebar is persistent; at mobile it is visually controlled by the menu button. The audit did not establish that the closed drawer is `aria-hidden`/inert, that focus is trapped while open, or that focus returns to the trigger on close. Shared trigger source: `src/shared/components/Header.js:128`.

**Impact:** Keyboard and screen-reader users may encounter duplicate navigation, tab through off-canvas content, or lose context when the drawer closes. Touch users can also receive a visually open drawer without a reliable back/Escape behavior if the overlay state is incomplete.

**Root cause:** Responsive presentation and semantic visibility are separate concerns; CSS visibility alone does not guarantee an accessible modal/drawer state.

**Applicable principles:**

- **Jakob’s Law / mental models:** a mobile menu should behave like a conventional drawer: clear open state, Escape/back dismissal, focus return.
- **Fitts’s Law:** the menu trigger is easy to hit, but the dismissal and focus targets must be equally predictable.
- **Tesler’s Law:** drawer complexity cannot be removed; it must be handled explicitly by the component.

**Recommendation:** When closed, make the drawer inert and unavailable to the accessibility tree. When open, add a labeled dialog/drawer region, scrim dismissal, Escape handling, focus containment, and focus return. Test both orientations and browser back behavior.

**Priority:** Immediate. **Confidence:** Medium-high; exact focus behavior requires a dedicated keyboard run.

### Medium M1: Endpoint field has no programmatic label

**Evidence:** Lighthouse `label` failed on the readonly endpoint input at `/dashboard`; snapshot exposed it only as `textbox readonly value="http://localhost:20128/v1"`. There is nearby visible “Local” text, but no associated label or accessible name.

**Impact:** Screen-reader users cannot identify what the copied value represents. Readonly does not remove the labeling requirement.

**Recommendation:** Add a visible `<label>` or `aria-label="Local API endpoint"`, and give the adjacent copy button a command name such as “Copy local API endpoint”.

**Priority:** Short-term. **Confidence:** High.

### Medium M2: Icon-only commands expose implementation glyph names

**Evidence:** The basic chat snapshot exposes `attach_file`, `arrow_upward`, `delete`, and `content_copy` as accessible names in several places. Some buttons are disabled, but disabled controls are still announced. The model picker is labeled well, while the composer commands are not consistently user-facing.

**Impact:** Screen-reader users hear icon font ligature tokens instead of “Attach file”, “Send message”, “Clear conversation”, or “Copy”. This increases cognitive load and makes state/action prediction harder.

**Recommendation:** Add explicit `aria-label` values to icon-only controls, keep visible tooltip text for unfamiliar icons, and avoid using ligature text as the only accessible name. Test disabled and enabled states.

**Priority:** Short-term. **Confidence:** High.

### Medium M3: No reduced-motion policy found in global CSS

**Evidence:** `src/app/globals.css:433-505` defines continuous `spin`, `pulse`, `border-glow`, `pulseGlow`, CTA shimmer, and CTA glow animations. A repository search found no `prefers-reduced-motion` rule. The landing page additionally uses animated blurred background and CTA effects.

**Impact:** Users with vestibular disorders or motion sensitivity may experience avoidable discomfort. Continuous effects also add visual competition to operational status information.

**Root cause:** Motion is defined centrally but accessibility preference handling is absent.

**Applicable principles:**

- **Doherty Threshold:** fast feedback is valuable, but continuous decorative motion is not required to meet the threshold.
- **Selective Attention:** animated accents can compete with connection/error state signals.
- **Peak-End Rule:** status transitions should communicate completion; perpetual shimmer does not improve task completion.

**Recommendation:** Add a global reduced-motion override that disables non-essential animation and replaces transform/opacity transitions with immediate state changes. Retain essential progress indication with a static status label and accessible live region.

**Priority:** Short-term. **Confidence:** High.

### Medium M4: Motion primitives are inconsistent with the stated design contract

**Evidence:** The global file uses several easing families: linear spin, cubic-bezier pulse, ease-in-out glow, ease-out fades, and shell `easeOutCirc`. Landing CTA animation uses repeated box-shadow and shimmer. Static guidance prefers transform/opacity and non-bouncy easing, but no shared motion tokens or reduced-motion variants are present.

**Impact:** The dashboard can feel visually inconsistent across drawers, loading indicators, status pulses, and marketing surfaces. Box-shadow animation may increase paint cost on lower-powered remote devices; this was not measured with a performance trace, so the performance conclusion remains a hypothesis.

**Recommendation:** Define a small motion scale for enter/exit/state-change and a separate attention animation. Prefer transform/opacity for transitions; keep status pulsing sparse and meaningful. Verify with a Performance trace before claiming a runtime regression.

**Priority:** Medium. **Confidence:** Medium.

### Medium M5: Model selection presents a very large choice set without visible filtering in the opened state

**Evidence:** The basic-chat model picker rendered more than 200 button options across provider groups in the accessibility tree, including repeated model ids and multiple “Key” groupings. The trigger itself is named “Select model … Choose from connected providers”, but the opened menu snapshot showed headings and buttons, not a search field.

**Impact:** Users can technically select a model, but scanning and keyboard navigation become expensive. This is especially relevant for the primary chat workflow where model choice precedes every request.

**Applicable principles:**

- **Hick’s Law:** decision time increases with the number of visible choices.
- **Miller’s Law / chunking:** provider grouping helps, but repeated long labels still exceed practical working-memory limits.
- **Choice overload:** connected-provider breadth is valuable, but the default surface should emphasize recent/favorite/compatible choices.

**Recommendation:** Add searchable filtering inside the picker, preserve provider grouping, expose a concise primary label with model id in secondary text, and offer recents/favorites. Confirm Arrow-key navigation, typeahead, Home/End, and Escape.

**Priority:** Medium. **Confidence:** Medium-high.

### Low L1: Dashboard and landing page use separate visual languages

**Evidence:** Dashboard tokens are warm coral/neutral semantic variables in `globals.css`; landing components use hard-coded dark brown/orange values, gradients, glow shadows, blurred blobs, and bespoke CTA animation (`src/app/landing/components/*`). This may be intentional because the project context distinguishes the promotional landing treatment from the dashboard.

**Impact:** Users moving from the public landing page into the utility may perceive a brand discontinuity. This is not a defect if the product intentionally treats the landing page as a separate campaign surface.

**Recommendation:** Keep the distinction if intentional, but share brand primitives and accessibility contracts. At minimum align focus styles, contrast rules, button naming, and reduced-motion behavior.

**Priority:** Low. **Confidence:** Medium.

### Low L2: Custom scrollbar styling is globally applied and thin

**Evidence:** `globals.css:311-339` applies an 8px WebKit scrollbar and `scrollbar-width: thin` globally, with several component-specific overrides.

**Impact:** Thin scrollbars can reduce discoverability and targetability on touch/remote desktop contexts. Native overlay scrollbar behavior also differs across browsers. No cross-browser verification was performed.

**Recommendation:** Scope custom scrollbars to dense code/log surfaces; preserve platform defaults for primary page scrolling. Validate keyboard and touch scrolling.

**Priority:** Low. **Confidence:** Medium.

### Low L3: Readonly copy workflow does not visibly expose copy feedback in the snapshot

**Evidence:** Endpoint and chat surfaces expose copy buttons, but the examined snapshot did not show a persistent visible confirmation; a polite live status region exists globally. The actual announcement timing was not verified.

**Impact:** Users may not know whether a copy action succeeded, especially when the target field is readonly and unchanged.

**Recommendation:** Announce “Copied” through the existing polite live region and provide a brief visual state on the button without relying on color alone. Test repeated clicks and clipboard-denied behavior.

**Priority:** Low. **Confidence:** Low-medium until clipboard permission/error behavior is tested.

### Low L4: Desktop shell is extremely wide before content needs it

**Evidence:** At the browser’s reported desktop viewport of 2548px, the app occupied the full width with a 256px sidebar and a 2260px main region. This is not overflow, but the operational content can become visually sparse at ultra-wide widths.

**Impact:** Long scan lines and excessive empty space can weaken grouping and increase eye travel. This is a usability hypothesis, not a measured defect.

**Recommendation:** Consider a max-width content measure for text-heavy pages while keeping tables/charts intentionally wide. Validate with real usage data before changing the shell.

**Priority:** Low. **Confidence:** Low.

## Positive Findings to Preserve

- Skip link is present and targets `#main-content`.
- Dashboard uses `main`, `navigation`, and `complementary` landmarks.
- Page headings are exposed at sensible levels on inspected routes.
- Theme and language controls have user-facing accessible names.
- Providers use search and meaningful provider/card names; images have alt text in inspected snapshots.
- Mobile has a dedicated navigation trigger rather than simply shrinking the desktop sidebar.
- The token system is more disciplined than the hard-coded landing surface and includes explicit light/dark mappings.
- Lighthouse best-practices and SEO scores were 100 for both inspected snapshots.
- At the measured 390px emulation, document width did not exceed the viewport; no broad horizontal overflow was observed. The one overflow candidate was the intentionally off-screen skip link.

## UX-Law Synthesis and Trade-offs

Only the following laws were supported by observable evidence:

- **Hick’s Law and choice overload:** supported by the model picker’s 200+ options; search and recents are justified. The trade-off is that progressive disclosure may hide advanced models, so provider grouping and direct search should remain available.
- **Law of Proximity:** supports the visible grouping of provider status and switches, but proximity cannot solve missing semantic labels. Semantic association wins over visual convenience.
- **Mental models/Jakob’s Law:** supports conventional drawer behavior and explicit model-picker dismissal. A custom drawer is acceptable only if it preserves familiar keyboard and focus rules.
- **Selective Attention:** supports reducing decorative motion and strengthening active navigation contrast because operational failures and current location are high-value signals.
- **Fitts’s Law:** supports keeping the mobile menu and primary action targets large enough, but target size alone does not fix unnamed controls or poor state feedback.
- **Aesthetic-Usability Effect:** the warm, coherent dashboard palette likely improves perceived usability, but the contrast evidence shows that aesthetic consistency must yield to readable semantic roles.

The audit does **not** claim that every listed UX law applies. There was insufficient evidence to conclude anything definitive about Goal-Gradient, Zeigarnik, Parkinson, Pareto, or Peak-End effects beyond the narrow motion observation above. Those require task completion studies, telemetry, or moderated usability testing.

## Prioritized Remediation Plan

### Immediate

- Fix `Toggle` naming and all switch consumers.
- Split primary accent text and filled-control tokens; re-run contrast checks in light and dark themes.
- Label endpoint and other readonly fields; name copy/delete/send/attach icon controls.
- Verify mobile drawer semantics, focus trap/return, Escape, scrim, and inertness.

### Short-term

- Add `prefers-reduced-motion` handling and a small motion-token layer.
- Add keyboard interaction tests for navigation, menus, model picker, dialogs, and composer.
- Add automated accessibility checks for representative routes and states, including open menus and error dialogs.

### Medium-term

- Add model-picker search, recents/favorites, provider-aware filtering, and typeahead.
- Standardize loading, empty, success, warning, and error feedback across providers, quota, usage, and settings.
- Run performance traces on chat streaming, usage charts, provider lists, and animated landing surfaces.

### Long-term / evidence needed first

- Cross-browser pass in Chromium, Firefox, and WebKit at desktop/mobile sizes.
- Zoom/text-scaling pass at 200% and 400%.
- Screen-reader pass with NVDA/VoiceOver.
- Moderated task testing for provider setup, API-key recovery, model selection, and chat send/retry flows.

## Verification Limits

I did not modify application code. Live provider OAuth, API-key failure recovery, streaming success/error paths, clipboard-denied behavior, authentication redirects, cross-browser rendering, and real network latency states were not fully verifiable from the local environment. These are explicit follow-up test gaps, not assumed passes.

## Source References

- [`src/app/globals.css`](../src/app/globals.css:20)
- [`src/shared/components/Toggle.js`](../src/shared/components/Toggle.js:34)
- [`src/shared/components/Header.js`](../src/shared/components/Header.js:128)
- [`src/app/(dashboard)/dashboard/basic-chat/BasicChatPageClient.js`](../src/app/(dashboard)/dashboard/basic-chat/BasicChatPageClient.js:742)
- [`src/app/(dashboard)/dashboard/providers/page.js`](../src/app/(dashboard)/dashboard/providers/page.js:433)
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- W3C contrast guidance: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C non-text contrast and focus guidance: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- MDN reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
