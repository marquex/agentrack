# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase1-validation.spec.ts >> Phase 1 Validation >> Frontend: Page Rendering >> renders the agentrack header
- Location: e2e/phase1-validation.spec.ts:39:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /agentrack/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /agentrack/i })

```

```yaml
- banner:
  - link "agentrack":
    - /url: /
  - link "Users":
    - /url: /users
    - button "Users"
  - button "Push"
  - button "Pull"
- main:
  - heading "Issues" [level=2]
  - button "New Issue"
  - textbox "Search issues..."
  - combobox: all
  - combobox: all
  - button "Expand"
  - 'link "mpr5dedwb8 Phase2 Test: Full issue In Progress P1 webapp-validator test phase2 +1"':
    - /url: /issues/mpr5dedwb8
  - button "Expand"
  - link "mpr5det9r8 Updated title by test In Progress P1 — updated tags":
    - /url: /issues/mpr5det9r8
  - button "Expand"
  - link "mpr5de5wve Blocker For Add 1780072778682-mhhif2 Idea P3 —":
    - /url: /issues/mpr5de5wve
  - button "Expand"
  - link "mpr5dexure Blocker Issue 1780072778661-3kmgs3 Idea P3 —":
    - /url: /issues/mpr5dexure
  - button "Expand"
  - link "mpr5de07ct Comment Validation Test 1780072778556-7nwmul Idea P3 —":
    - /url: /issues/mpr5de07ct
  - button "Expand"
  - link "mpr5de08h7 Child 1 1780072778817-egkukk Idea P3 —":
    - /url: /issues/mpr5de08h7
  - button "Expand"
  - link "mpr5de0f59 No Comments Test 1780072778977-v0xi45 Idea P3 —":
    - /url: /issues/mpr5de0f59
  - button "Expand"
  - link "mpr5de0ihe History Test 1780072778758-29qs7d Idea P3 —":
    - /url: /issues/mpr5de0ihe
  - button "Expand"
  - link "mpr5de1l82 Delete Comment Test 1780072778612-kamndj Idea P3 —":
    - /url: /issues/mpr5de1l82
  - button "Expand"
  - link "mpr5de1rtc Comment Empty Test 1780072778567-8zv9p3 Idea P3 —":
    - /url: /issues/mpr5de1rtc
  - button "Expand"
  - link "mpr5de1wbl SearchTest-1780072778569 Idea P3 —":
    - /url: /issues/mpr5de1wbl
  - button "Expand"
  - 'link "mpr5de3at4 Phase2 Test: Issue shape validation Todo P3 — test phase2"':
    - /url: /issues/mpr5de3at4
  - button "Expand"
  - link "mpr5de5vyj Tagged issue Idea P3 — tag-1780072778594":
    - /url: /issues/mpr5de5vyj
  - button "Expand"
  - link "mpr5de6tuk Blocked Resolve Test 1780072778712-zzzuv5 Idea P3 —":
    - /url: /issues/mpr5de6tuk
  - button "Expand"
  - link "mpr5de8uca Blocker Delete Test 1780072778731-hfq9rq Idea P3 —":
    - /url: /issues/mpr5de8uca
  - button "Expand"
  - link "mpr5deah0l CaseTest-1780072778576 Idea P3 —":
    - /url: /issues/mpr5deah0l
  - button "Expand"
  - link "mpr5deawb8 Parent Issue 1780072778794-6w85ou Idea P3 —":
    - /url: /issues/mpr5deawb8
  - button "Expand"
  - link "mpr5debd3r Blocked Delete Test 1780072778734-eqij5e Idea P3 —":
    - /url: /issues/mpr5debd3r
  - button "Expand"
  - link "mpr5decgjw Edit Comment Validation 1780072778598-2p6bby Idea P3 —":
    - /url: /issues/mpr5decgjw
  - button "Expand"
  - link "mpr5dechif Resolve Validation 1780072778724-hf88fr Idea P3 —":
    - /url: /issues/mpr5dechif
  - button "Expand"
  - link "mpr5ded607 Blockage Empty Array 1780072778699-4kzow4 Idea P3 —":
    - /url: /issues/mpr5ded607
  - button "Expand"
  - link "mpr5dedpzt Comments List Test 1780072778508-mo0xu5 Idea P3 —":
    - /url: /issues/mpr5dedpzt
  - button "Expand"
  - 'link "mpr5deds4l Phase2 Test: Minimal issue Idea P3 —"':
    - /url: /issues/mpr5deds4l
  - button "Expand"
  - link "mpr5deduuq Blockages List Test 1780072778630-d27iw4 Idea P3 —":
    - /url: /issues/mpr5deduuq
  - button "Expand"
  - link "mpr5dee8os Add Comment Test 1780072778547-hf369i Idea P3 —":
    - /url: /issues/mpr5dee8os
  - button "Expand"
  - link "mpr5defnn9 Parent Filter Test 1780072778815-q4mto0 Idea P3 —":
    - /url: /issues/mpr5defnn9
  - button "Expand"
  - link "mpr5defpbk Next Issue Test 1780072778785-n92ire Todo P3 next-tester-1780072778785-gmkbjk":
    - /url: /issues/mpr5defpbk
  - button "Expand"
  - link "mpr5degnpw Child Clear Test 1780072778807-zt94zw Idea P3 —":
    - /url: /issues/mpr5degnpw
  - button "Expand"
  - link "mpr5degsg1 Comment Shape Test 1780072778532-y2iyq8 Idea P3 —":
    - /url: /issues/mpr5degsg1
  - button "Expand"
  - link "mpr5degshm Child 2 1780072778819-xhb9of Idea P3 —":
    - /url: /issues/mpr5degshm
  - button "Expand"
  - link "mpr5degwtt History Update Test 1780072778767-qivs8b Todo P3 —":
    - /url: /issues/mpr5degwtt
  - button "Expand"
  - link "mpr5dejzof Clear Parent Test 1780072778805-txxor4 Idea P3 —":
    - /url: /issues/mpr5dejzof
  - button "Expand"
  - 'link "mpr5dempqj Phase2 Test: Default status Idea P3 —"':
    - /url: /issues/mpr5dempqj
  - button "Expand"
  - link "mpr5denflf Comment Type Test 1780072778575-3lhjhk Idea P3 —":
    - /url: /issues/mpr5denflf
  - button "Expand"
  - link "mpr5deo18m Delete Validation 1780072778749-xkigpr Idea P3 —":
    - /url: /issues/mpr5deo18m
  - button "Expand"
  - link "mpr5depb1h Blockage Validation 1780072778691-5eobht Idea P3 —":
    - /url: /issues/mpr5depb1h
  - button "Expand"
  - link "mpr5depp7a Blocked For Add 1780072778680-2a7unk Idea P3 —":
    - /url: /issues/mpr5depp7a
  - button "Expand"
  - link "mpr5der0sg Blocker Resolve Test 1780072778710-ikuvl9 Idea P3 —":
    - /url: /issues/mpr5der0sg
  - button "Expand"
  - link "mpr5desmpk Child Issue 1780072778797-dkus5x Idea P3 —":
    - /url: /issues/mpr5desmpk
  - button "Expand"
  - 'link "mpr5detd4a Phase2 Test: Detail view Idea P3 —"':
    - /url: /issues/mpr5detd4a
  - button "Expand"
  - link "mpr5dev4lj Blocked Issue 1780072778667-cb83w0 Idea P3 —":
    - /url: /issues/mpr5dev4lj
  - button "Expand"
  - link "mpr5dex5jh Edit Comment Test 1780072778586-h5nb3s Idea P3 —":
    - /url: /issues/mpr5dex5jh
```

# Test source

```ts
  1  | /**
  2  |  * Phase 1 E2E Validation Tests
  3  |  *
  4  |  * Validates the core Phase 1 acceptance criteria:
  5  |  * 1. bun run dev:server starts without error
  6  |  * 2. GET /api/health returns 200 with correct JSON
  7  |  * 3. Frontend renders a page with the agentrack header
  8  |  * 4. Vite proxy successfully hits /api/health
  9  |  */
  10 | import { test, expect } from "@playwright/test";
  11 | 
  12 | test.describe("Phase 1 Validation", () => {
  13 |   test.describe("Backend: Health Endpoint", () => {
  14 |     test("GET /api/health returns 200 status", async ({ request }) => {
  15 |       const response = await request.get("http://localhost:3001/api/health");
  16 |       expect(response.status()).toBe(200);
  17 |     });
  18 | 
  19 |     test("GET /api/health returns correct JSON shape", async ({ request }) => {
  20 |       const response = await request.get("http://localhost:3001/api/health");
  21 |       const body = await response.json();
  22 | 
  23 |       expect(body).toHaveProperty("status");
  24 |       expect(body.status).toBe("ok");
  25 |       expect(body).toHaveProperty("tracker");
  26 |       expect(["initialized", "not_initialized"]).toContain(body.tracker);
  27 |     });
  28 | 
  29 |     test("GET /api/health returns Content-Type application/json", async ({
  30 |       request,
  31 |     }) => {
  32 |       const response = await request.get("http://localhost:3001/api/health");
  33 |       const contentType = response.headers()["content-type"];
  34 |       expect(contentType).toContain("application/json");
  35 |     });
  36 |   });
  37 | 
  38 |   test.describe("Frontend: Page Rendering", () => {
  39 |     test("renders the agentrack header", async ({ page }) => {
  40 |       await page.goto("/");
  41 |       const header = page.getByRole("heading", { name: /agentrack/i });
> 42 |       await expect(header).toBeVisible();
     |                            ^ Error: expect(locator).toBeVisible() failed
  43 |     });
  44 | 
  45 |     test("page has correct title", async ({ page }) => {
  46 |       await page.goto("/");
  47 |       await expect(page).toHaveTitle("agentrack");
  48 |     });
  49 | 
  50 |     test("page body renders without errors", async ({ page }) => {
  51 |       const errors: string[] = [];
  52 |       page.on("pageerror", (err) => errors.push(err.message));
  53 | 
  54 |       await page.goto("/");
  55 |       await page.waitForLoadState("networkidle");
  56 | 
  57 |       expect(errors).toEqual([]);
  58 |     });
  59 |   });
  60 | 
  61 |   test.describe("Vite Proxy: API Forwarding", () => {
  62 |     test("frontend proxy forwards /api/health to backend", async ({
  63 |       page,
  64 |     }) => {
  65 |       // Navigate to the frontend app through Vite dev server
  66 |       await page.goto("/");
  67 | 
  68 |       // Make an API call through the Vite proxy
  69 |       const response = await page.evaluate(async () => {
  70 |         const res = await fetch("/api/health");
  71 |         return {
  72 |           status: res.status,
  73 |           json: await res.json(),
  74 |         };
  75 |       });
  76 | 
  77 |       expect(response.status).toBe(200);
  78 |       expect(response.json.status).toBe("ok");
  79 |       expect(response.json).toHaveProperty("tracker");
  80 |     });
  81 |   });
  82 | });
  83 | 
```