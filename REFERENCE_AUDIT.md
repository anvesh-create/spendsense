# SpendSense Reference Audit

This audit records the visible content of every image present in `reference-images`. The screenshots include example figures and sample labels; those are visual content, not product data requirements. Handwritten notes are transcribed cautiously, and uncertain wording is called out rather than treated as a confirmed requirement.

## Inspected images

### `SpendSense_UI_01.png` — Import landing screen

- **Screen and layout:** A centered, single-column import landing page on a warm off-white background. SpendSense compass logo and wordmark sit above a large dashed upload drop zone, with two side-by-side navigation buttons beneath.
- **Colors and typography:** Dark navy logo and text, emerald/teal-green accents, muted gray supporting text, and a pale green-tinted upload area. The sans-serif text uses a large bold brand wordmark and clear, medium-to-bold control labels.
- **Components:** Upload icon, “Import” heading, supporting note that CSV, Excel (XLSX), and PDF files are supported, “Overview” button (filled green), and “History” button (green outline with clock icon).
- **Visible interactions:** The upload area indicates bank-statement file selection/import. Overview and History are navigation actions. No file has been selected in this state.

### `SpendSense_UI_02.png` — Selected statement ready to manage

- **Screen and layout:** Centered import page with the same logo, warm off-white background, and two-button navigation as the first screenshot. A green-outlined statement card contains upload heading/help text and a selected-file row.
- **Colors and typography:** Dark navy branding and headings, green outlines/icons/buttons, pale green file-row background, gray file metadata, and a red PDF badge. Sans-serif text with bold file name and heading.
- **Components:** “Import Bank Statement” heading and upload icon; file row for `HDFC_Statement_Oct_2026.pdf` (PDF, 248 KB); “Remove” and “Replace” outlined controls; “Overview” and “History” navigation buttons.
- **Visible interactions:** Replace or remove the chosen file, continue to Overview, or open History. The screenshot shows a selected file, not a processing result.

### `SpendSense_UI_03.png` — Invalid statement upload

- **Screen and layout:** Centered import card, with the compass logo and wordmark above it and Overview/History navigation below. The selected file appears inside a red-tinted row in the outlined import panel.
- **Colors and typography:** Warm off-white page; dark navy branding and heading; green import/navigation outlines; red file-row border/tint, warning icon, and error text; muted gray file metadata. Bold sans-serif text draws attention to the validation error.
- **Components:** “Import Bank Statement” header; selected `My_Bank_File.pdf` (PDF, 2.4 MB) with a visible remove/close icon; warning “Invalid upload — please select a valid bank statement.”; “Try Again” button with a refresh icon; Overview and History buttons.
- **Visible interactions:** Remove the selected file, retry the upload, navigate to Overview, or open History. The screenshot explicitly communicates rejection of an invalid statement.

### `SpendSense_UI_04.png` — Statement processing/loading state

- **Screen and layout:** Minimal centered status view with the SpendSense logo at the top, a circular progress indicator, a prominent processing message, and supporting explanatory text. Overview/History buttons remain visible below.
- **Colors and typography:** Warm off-white background; dark navy logo and headline; green progress-ring segment and navigation controls; gray supporting text. Large bold sans-serif status heading.
- **Components:** Progress spinner; “Processing your statement…” status; “Validating transactions and preparing your overview” subtext; Overview and History navigation.
- **Visible interactions:** This is a loading/progress state rather than a form. The screenshot indicates statement validation and overview preparation; navigation controls are visible, but no cancel/retry control is shown.

### `SpendSense_UI_05.png` — Analytics dashboard

- **Screen and layout:** Dense desktop analytics dashboard. A full-width top bar contains the SpendSense logo, overview search field, settings gear, and two circular profile/agent controls. A fixed left navigation rail sits beside a two-column grid of analytics cards. A date-range selector is at the upper right of the content area.
- **Colors and typography:** Mostly white and warm off-white surfaces with faint gray dividers, dark navy text/icons, and a green palette for selected navigation, chart series, bars, and accents. Sans-serif typography uses large bold section headings, smaller labels, and numerical chart annotations.
- **Components:** Sidebar items: Dashboard, Transactions, Analytics (selected), Individual Spending, Compare Imports, and Download Overview Report. Main content shows “Analytics” and a date range (“Jul 2025 - Sep 2025”); a “Spending by Category” pie chart with category/value/percentage legend; “Monthly Income vs Expenses” grouped bar chart; “Top Spending Categories” horizontal bars; and a “Category Breakdown” table. Top bar includes search, settings, “PO” profile, and “PA” agent buttons.
- **Visible interactions:** Sidebar navigation; search; settings/profile/Personal Agent controls; date-range selection; and report download. Charts and category rows are displayed as analytics; no chart-specific interaction is visibly indicated.

### `SpendSense_UI_06.png` — Overview dashboard, first layout

- **Screen and layout:** Desktop application shell with brand/search/settings/profile/agent header, left navigation rail, period selector, four metric cards, and two content cards below.
- **Colors and typography:** Warm white background, navy text and icons, emerald controls and pie slices, red expense values, and soft green card accents. Bold sans-serif headings and large metric values.
- **Components:** Income, expenses, balance (explicitly “Income - Expenses”), and transaction-count cards; category pie/legend; recent transaction table with date, merchant, category, amount, and “View All” link. Sidebar includes Dashboard, Transactions, Analytics, Individual Spending, Compare Imports, and Download Overview Report.
- **Visible interactions:** Global search, settings, profile/agent controls, date range, category period selector, View All, and sidebar links.

### `SpendSense_UI_07.png` — Transactions list

- **Screen and layout:** Shared top header and left navigation framing a large transaction table. Page title and subtitle appear above date/category filters.
- **Colors and typography:** White/off-white surfaces, navy text, pale green table header, colored category chips/icons, red negative expenses and green income.
- **Components:** Sortable-looking Date, Description, Category, and Amount headers; “All Dates” and “All Categories” dropdowns; transaction rows with dates, merchant/description, categories, and INR amounts.
- **Visible interactions:** Date and category filters; column sort indicators; global search and sidebar navigation. Sort/search behavior is suggested by controls but not shown in operation.

### `SpendSense_UI_08.png` — Import landing, alternate design

- **Screen and layout:** Standalone centered import page with large compass/wordmark and the tagline “Your Personal Budget & Spending Insight Agent,” a dashed upload panel, and Overview/History buttons.
- **Colors and typography:** Off-white background, navy brand and copy, emerald green upload frame/icons and buttons, pale green upload surface, clean sans-serif.
- **Components:** File upload icon, “Import,” bank-statement prompt, CSV/Excel/PDF format note, filled Overview and outlined History buttons.
- **Visible interactions:** Select/import a file, go to Overview, or open History.
- **Relationship:** Functionally duplicates UI_01, with a tagline and slightly different copy/layout. See inconsistencies section.

### `SpendSense_UI_09.png` — Download overview report

- **Screen and layout:** Shared application shell and navigation, with a report page containing a broad preview card. Metrics span the top, category chart and legend fill the lower-left, report thumbnail appears at right, and a prominent download button sits below the chart.
- **Colors and typography:** White/off-white panels, navy headings/text, green positive metrics and chart, red expense icon/accent, light borders; consistent sans-serif hierarchy.
- **Components:** “Download Overview Report” heading and explanatory text; generated date; report period; income, expenses, and balance cards; spending-by-category donut chart/legend; report preview thumbnail; “Download Report” button.
- **Visible interactions:** Report download and application navigation. Preview content appears based on an imported statement.

### `SpendSense_UI_10.png` — Settings

- **Screen and layout:** Shared header and sidebar, with three wide settings cards in a vertical content column.
- **Colors and typography:** White cards on warm off-white, navy labels, pale green icon circles, emerald selected controls, muted explanatory copy.
- **Components:** Appearance selector (Light/Dark), currency dropdown currently showing Indian Rupee (INR), optional Personal Agent enable toggle, and a Settings navigation item.
- **Visible interactions:** Choose theme/currency and enable or disable Personal Agent. This capture does not show a save button or a confirmation state.

### `SpendSense_UI_11.png` — Individual spending by merchant/source

- **Screen and layout:** Shared shell and sidebar; main panel has title/subtitle, three dropdown filters above a wide ranked table.
- **Colors and typography:** Off-white/white background, navy text, pale green table header, merchant brand images/icons, colored category chips, emerald horizontal share bars.
- **Components:** Time range (“All Time”), category, and merchant filters; columns for rank, Merchant/Source, Transactions, Category, Total Spending, and Spending Share. Sample merchants include Swiggy, Amazon, Uber, Airtel, Zomato, Flipkart, CRED, and IRCTC.
- **Visible interactions:** Filter by range/category/merchant and select merchant/source rows (the screenshot itself does not show a detail view).

### `SpendSense_UI_12.png` — Personal Agent conversation

- **Screen and layout:** Shared application shell with “Personal Agent” as the main panel. A large conversation area alternates left-side agent messages and right-side user messages; suggested prompts and composer sit along the bottom.
- **Colors and typography:** Light neutral surfaces, navy text, pale mint agent bubbles, emerald user bubbles and send button, green-outline prompt chips.
- **Components:** Agent greeting, example user questions and data-bearing replies, suggestions including “Where did my money go?”, “How can I save more?”, “Show my largest expenses,” and “What are my subscriptions?”; text composer with attachment icon and send control.
- **Visible interactions:** Choose a suggested prompt, type a question, attach a file, send a message. Examples discuss spending, categories, and savings based on an imported statement; their figures are illustrative.

### `SpendSense_UI_13.png` — Overview dashboard, alternate visualization controls

- **Screen and layout:** Shared shell with dashboard title/subtitle, month selector, four summary cards across the top, then a two-column area for category spending and recent transactions.
- **Colors and typography:** White/off-white surfaces, navy type, green income/category chart, red expense value, neutral transaction card, sans-serif headings.
- **Components:** Total income, total expenses, balance, transaction count; category pie chart with Amount/Percentage toggle; recent transaction rows and View All link.
- **Visible interactions:** Month selector, chart display toggle, View All, global search, and navigation.
- **Relationship:** Another dashboard variation, with different sample figures and category labels from UI_06 and UI_16.

### `SpendSense_UI_14.png` — Past overviews/history

- **Screen and layout:** Shared header/sidebar with “Past Overviews” content; a table of saved analyses spans the central panel.
- **Colors and typography:** Off-white/white shell, navy type, pale green table heading, green document icons and outlined Open Overview buttons.
- **Components:** Columns for row number, Statement Name, Analysis Date, Statement Period, and Action; each entry has an “Open Overview” button and overflow menu.
- **Visible interactions:** Open a saved analysis and access per-row overflow actions. The screenshot does not reveal the overflow menu contents; handwritten notes separately indicate that imported history should be saved and reopened.

### `SpendSense_UI_15.png` — Compare imports

- **Screen and layout:** Shared shell with two statement selectors side-by-side, swap-direction icon, and Compare button. Summary comparison table is followed by a category-wise comparison table.
- **Colors and typography:** White/off-white cards, navy text, pale green table headers, green positive change values, red increases/decreases where shown, two-tone horizontal comparisons.
- **Components:** Statement selectors with period and transaction counts; summary metrics (income, expenses, closing balance, transaction count); change values/percentages/arrows; category spending comparison with visual bars.
- **Visible interactions:** Select two saved statements, swap comparison sides, run Compare, and navigate.
- **Relationship:** Values are illustrative. Screenshot labels include “Closing Balance,” which is not necessarily the same as calculated net income-minus-expenses.

### `SpendSense_UI_16.png` — Dashboard, expanded trend/merchant layout

- **Screen and layout:** Shared desktop shell with month range selector; four cards across the top and a two-row, two-column set of content cards.
- **Colors and typography:** Navy text/icons, emerald income/expense charts, green savings and transaction accents, red expense highlights, warm neutral backgrounds.
- **Components:** Total Income, Total Expenses, Savings, Transactions cards with month-over-month percentages; spending-by-category donut chart; Recent Transactions; Monthly Trend bar chart; Top Merchant Spendings bar list.
- **Visible interactions:** Date range, category chart selector, recent transaction and merchant “View All” links, and shared navigation.
- **Relationship:** Uses “Savings” instead of the “Balance” card seen in other overview images, and monthly comparison indicators absent from other dashboard references.

### `spendsense Compass.png` — Primary brand logo asset

- **Screen and layout:** Square image with a centered compass emblem above a lowercase “spendsense” wordmark and generous negative space.
- **Colors and typography:** Deep navy/near-black and emerald facets on a light cream background; geometric compass points and tick marks; rounded, custom-looking lowercase wordmark.
- **Components and purpose:** Standalone logo lockup, intended as the primary brand asset across import screens, navigation, reports, and application identity. No interaction.

### `SpendSense Personal Finance UI Showcase.png` — Multi-screen visual index

- **Screen and layout:** Contact sheet of multiple miniature application screenshots on a white canvas. Green title bars label views, and several mobile screens appear alongside desktop UI states. It functions as an index rather than a single screen.
- **Colors and typography:** Repeats the shared white/cream, navy, and green design; small captions use white text on green bars. Thumbnail text and data are too small to treat as independent product requirements where unreadable.
- **Visible screen topics from legible captions/thumbnails:** Past overview, top search results, individual merchant spending details, interactive category pie, statement comparison results, report download options, Personal Agent response, settings/currency, dark mode, backend processing failure, no transactions, delete confirmation, and mobile import/overview/agent views.
- **Visible interactions:** The index signals search results, merchant details, comparison, report format/options, agent chat, settings, theme, retries/back navigation, changing period/import, delete confirmation/cancel, and responsive mobile layouts. The detailed standalone UI screenshots take precedence for exact visual behavior where the thumbnail is too small.

### `WhatsApp Image 2026-10-20 at 10.48.26.jpeg` — Handwritten backend/data-flow notes

- **Screen and layout:** Photograph of a handwritten notebook page; this is a requirements note, not an application screen.
- **Legible requirements:** Backend configuration should use an environment file for Supabase URL/API keys; frontend should connect to backend. Calculations and overview/chart outputs should wait for backend processing; calculations should be performed backend-side. Frontend should follow an agreed plan without unapproved visual changes; buttons should be functional and retain the green/white treatment. A top search should find information within the web app, and the agent should guide using in-app information.
- **Uncertainty:** Some handwriting is unclear; exact implementation/security semantics of the Supabase keys are not specified. Keep secrets server-side and confirm any unresolved deployment choices before implementation.

### `WhatsApp Image 2026-10-20 at 10.48.31.jpeg` — Handwritten import and product-scope notes

- **Screen and layout:** Photograph of a handwritten notebook page describing the app identity and import flow.
- **Legible requirements:** Product title is “Personal Budget & Spending Insight Agent”; use the uploaded logo. A web deployment and/or mobile app is contemplated. Starting page should focus on importing, with Overview and History buttons below. Uploaded content should be a bank statement; unrelated documents should show “Invalid upload.” A successful import shows a loading state while backend work runs, then opens Overview.
- **Uncertainty:** The note mentions file/photo/Excel/PDF in a broad statement; actual supported formats and phone-app deliverable need to be defined. This spec treats a responsive web app as the first deliverable and file support as constrained by tested parsers.

### `WhatsApp Image 2026-10-20 at 10.48.32.jpeg` — Handwritten shell/navigation and visual notes

- **Screen and layout:** Photograph of a hand-drawn desktop application wireframe with a header, search, settings, profile/history (“PO”), Personal Agent (“PA”), left navigation, and main content area.
- **Legible requirements:** Shared header/sidebar; Dashboard, Transactions, Analytics, Individual Spending, Compare Imports, Download Overview Report; selected page in main area; past overview/history saved and reopenable; recent downloads should be discoverable from report area; settings should offer day/night themes. Uses green, white, and dark/black colors.
- **Visible relationships:** “PO” is associated with past overview/history and “PA” with Personal Agent, intended for web app use. Exact avatar/profile behavior is not defined.

### `WhatsApp Image 2026-10-20 at 10.48.33.jpeg` — Handwritten optional settings and layout notes

- **Screen and layout:** Photograph of a handwritten page about optional Personal Agent settings, currency, page-specific layouts, and common styling.
- **Legible requirements:** Personal Agent can be enabled/disabled; settings include currency selection (INR is emphasized); pages should have distinct content rather than reuse one generic page; common styling should retain green/white/black. Sketches refer to Individual Spending, Dashboard, Settings, past history, PA chat, Transactions, and Analytics.
- **Uncertainty:** The wording around a separate “personal PIN” / app-only access is not fully clear. Treat this as an unresolved optional authentication/mobile requirement, not as confirmed functionality. Currency conversion versus display currency is also not fully specified; do not convert balances without an explicit conversion policy.

## Cross-reference inconsistencies and proposed resolutions

1. **Standalone import flow versus authenticated-looking application shell:** UI_01–04 and UI_08 show a focused import page; UI_05–07 and UI_09–16 show the full navigation shell. Treat import as the onboarding/entry route and keep the full shell for imported, history, and utility pages. Keep Overview and History reachable from import.
2. **Different dashboard metric cards and category labels:** UI_06 and UI_13 show Income/Expenses/Balance/Transactions; UI_16 shows Income/Expenses/Savings/Transactions. Preserve all concepts: define Balance as net flow for a selected statement period, distinguish it from bank closing balance, and show Savings only if an explicit savings metric can be derived and explained. Do not use screenshot figures as live data.
3. **History labels/actions vary:** UI_01/08 call it “History”; UI_14 calls it “Past Overviews”; handwritten notes mention saved history and reopening. Use one History/Past Overviews destination with a consistent label (e.g., “History” in compact import navigation and “Past Overviews” as page heading), preserve open and overflow actions, and require confirmation for deletion.
4. **Settings persistence and controls differ:** UI_10 has theme, currency, and agent toggle but no save affordance; handwritten notes say settings exist and optional agent. Provide explicit save/apply feedback, persist settings, retain Light/Dark, INR, and optional agent controls.
5. **Currency selection versus currency conversion:** INR is shown and emphasized in notes, but no exchange-rate source or conversion semantics are specified. Support display formatting/configuration first; do not silently convert transaction amounts or mix currencies.
6. **Statement formats and validation:** screenshots mention CSV, Excel, PDF; handwritten notes say reject non-bank files. Extensions alone are insufficient, and scanned/unsupported PDFs may not parse. Advertise only verified parser support, show clear validation failures, and never treat arbitrary documents as statements.
7. **Backend calculations and visual charts:** handwritten notes explicitly assign calculations/chart data to backend. Implement a single authoritative backend calculation layer; front end renders returned data. This prevents mismatched totals across dashboard, report, comparison, and agent.
8. **Reports and recent downloads:** UI_09 shows preview/download; notes mention saved recent downloads. Keep the report preview and download action, and record report metadata/history without requiring public access to private files.
9. **Personal Agent availability and AI behavior:** UI_12 gives the agent a global entry and settings can disable it; notes say optional and restricted to in-app information. Keep it optional, ground factual answers in authorized imported data, and present a graceful unavailable state when disabled or unconfigured.
10. **Desktop/mobile scope:** Showcase includes mobile thumbnails while the detailed screens are desktop. Preserve all features in responsive layouts; treat a separately packaged mobile app as a later scope decision, not a reason to omit mobile web usability.

## Inspection status

All 22 files present in `reference-images` were visually inspected individually for this audit. No image was inaccessible.
