# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase2-validation.spec.ts >> Phase 2 Validation >> Backend: POST /api/issues >> defaults priority to 3 when not provided
- Location: e2e/phase2-validation.spec.ts:244:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 3
Received: undefined
```

# Test source

```ts
  154 |       );
  155 |       expect(response.status()).toBe(200);
  156 |       const issues = await response.json();
  157 |       expect(issues.length).toBeGreaterThanOrEqual(1);
  158 |       for (const issue of issues) {
  159 |         expect(issue.tags).toContain(uniqueTag);
  160 |       }
  161 |     });
  162 |   });
  163 | 
  164 |   // ─── Backend: POST /api/issues ──────────────────────────────────────
  165 | 
  166 |   test.describe("Backend: POST /api/issues", () => {
  167 |     test("creates an issue with required fields only", async ({ request }) => {
  168 |       const response = await request.post("http://localhost:3001/api/issues", {
  169 |         data: { title: "Phase2 Test: Minimal issue" },
  170 |       });
  171 |       expect(response.status()).toBe(201);
  172 |       const body = await response.json();
  173 |       expect(body).toHaveProperty("id");
  174 |       expect(typeof body.id).toBe("string");
  175 |       expect(body.id.length).toBeGreaterThan(0);
  176 |     });
  177 | 
  178 |     test("creates an issue with all fields", async ({ request }) => {
  179 |       const response = await request.post("http://localhost:3001/api/issues", {
  180 |         data: {
  181 |           title: "Phase2 Test: Full issue",
  182 |           description: "This is a test description",
  183 |           status: "in-progress",
  184 |           assignee: "webapp-validator",
  185 |           tags: ["test", "phase2", "full"],
  186 |           priority: 1,
  187 |         },
  188 |       });
  189 |       expect(response.status()).toBe(201);
  190 |       const body = await response.json();
  191 |       expect(body.id).toBeDefined();
  192 | 
  193 |       const viewRes = await request.get(
  194 |         `http://localhost:3001/api/issues/${body.id}`
  195 |       );
  196 |       const issue = await viewRes.json();
  197 |       expect(issue.title).toBe("Phase2 Test: Full issue");
  198 |       expect(issue.description).toBe("This is a test description");
  199 |       expect(issue.status).toBe("in-progress");
  200 |       expect(issue.assignee).toBe("webapp-validator");
  201 |       expect(issue.tags).toEqual(["test", "phase2", "full"]);
  202 |       expect(issue.priority).toBe(1);
  203 |     });
  204 | 
  205 |     test("returns 400 when title is missing", async ({ request }) => {
  206 |       const response = await request.post("http://localhost:3001/api/issues", {
  207 |         data: {},
  208 |       });
  209 |       expect(response.status()).toBe(400);
  210 |       const body = await response.json();
  211 |       expect(body.error).toBe(true);
  212 |       expect(body.code).toBe("VALIDATION_ERROR");
  213 |     });
  214 | 
  215 |     test("returns 400 when title is empty string", async ({ request }) => {
  216 |       const response = await request.post("http://localhost:3001/api/issues", {
  217 |         data: { title: "   " },
  218 |       });
  219 |       expect(response.status()).toBe(400);
  220 |     });
  221 | 
  222 |     test("returns 400 when title is not a string", async ({ request }) => {
  223 |       const response = await request.post("http://localhost:3001/api/issues", {
  224 |         data: { title: 123 },
  225 |       });
  226 |       expect(response.status()).toBe(400);
  227 |     });
  228 | 
  229 |     test("defaults status to 'idea' when not provided", async ({
  230 |       request,
  231 |     }) => {
  232 |       const response = await request.post("http://localhost:3001/api/issues", {
  233 |         data: { title: "Phase2 Test: Default status" },
  234 |       });
  235 |       const body = await response.json();
  236 | 
  237 |       const viewRes = await request.get(
  238 |         `http://localhost:3001/api/issues/${body.id}`
  239 |       );
  240 |       const issue = await viewRes.json();
  241 |       expect(issue.status).toBe("idea");
  242 |     });
  243 | 
  244 |     test("defaults priority to 3 when not provided", async ({ request }) => {
  245 |       const response = await request.post("http://localhost:3001/api/issues", {
  246 |         data: { title: "Phase2 Test: Default priority" },
  247 |       });
  248 |       const body = await response.json();
  249 | 
  250 |       const viewRes = await request.get(
  251 |         `http://localhost:3001/api/issues/${body.id}`
  252 |       );
  253 |       const issue = await viewRes.json();
> 254 |       expect(issue.priority).toBe(3);
      |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  255 |     });
  256 |   });
  257 | 
  258 |   // ─── Backend: GET /api/issues/:id ───────────────────────────────────
  259 | 
  260 |   test.describe("Backend: GET /api/issues/:id", () => {
  261 |     test("returns full issue detail", async ({ request }) => {
  262 |       const createRes = await request.post(
  263 |         "http://localhost:3001/api/issues",
  264 |         {
  265 |           data: {
  266 |             title: "Phase2 Test: Detail view",
  267 |             description: "Detailed description here",
  268 |           },
  269 |         }
  270 |       );
  271 |       const { id } = await createRes.json();
  272 | 
  273 |       const response = await request.get(
  274 |         `http://localhost:3001/api/issues/${id}`
  275 |       );
  276 |       expect(response.status()).toBe(200);
  277 |       const issue = await response.json();
  278 | 
  279 |       expect(issue.id).toBe(id);
  280 |       expect(issue.title).toBe("Phase2 Test: Detail view");
  281 |       expect(issue.description).toBe("Detailed description here");
  282 |       expect(issue).toHaveProperty("createdAt");
  283 |       expect(issue).toHaveProperty("createdBy");
  284 |       expect(issue).toHaveProperty("updatedAt");
  285 |     });
  286 | 
  287 |     test("returns 404 for non-existent issue", async ({ request }) => {
  288 |       const response = await request.get(
  289 |         "http://localhost:3001/api/issues/nonexistent123"
  290 |       );
  291 |       expect(response.status()).toBe(404);
  292 |       const body = await response.json();
  293 |       expect(body.error).toBe(true);
  294 |     });
  295 |   });
  296 | 
  297 |   // ─── Backend: PATCH /api/issues/:id ─────────────────────────────────
  298 | 
  299 |   test.describe("Backend: PATCH /api/issues/:id", () => {
  300 |     let testIssueId: string;
  301 | 
  302 |     test.beforeAll(async ({ request }) => {
  303 |       const createRes = await request.post(
  304 |         "http://localhost:3001/api/issues",
  305 |         {
  306 |           data: { title: "Phase2 Test: Update target" },
  307 |         }
  308 |       );
  309 |       const body = await createRes.json();
  310 |       testIssueId = body.id;
  311 |     });
  312 | 
  313 |     test("updates status", async ({ request }) => {
  314 |       const response = await request.patch(
  315 |         `http://localhost:3001/api/issues/${testIssueId}`,
  316 |         { data: { status: "in-progress" } }
  317 |       );
  318 |       expect(response.status()).toBe(200);
  319 |       const body = await response.json();
  320 |       expect(body.result).toBe("OK");
  321 | 
  322 |       const viewRes = await request.get(
  323 |         `http://localhost:3001/api/issues/${testIssueId}`
  324 |       );
  325 |       const issue = await viewRes.json();
  326 |       expect(issue.status).toBe("in-progress");
  327 |     });
  328 | 
  329 |     test("updates priority", async ({ request }) => {
  330 |       const response = await request.patch(
  331 |         `http://localhost:3001/api/issues/${testIssueId}`,
  332 |         { data: { priority: 1 } }
  333 |       );
  334 |       expect(response.status()).toBe(200);
  335 | 
  336 |       const viewRes = await request.get(
  337 |         `http://localhost:3001/api/issues/${testIssueId}`
  338 |       );
  339 |       const issue = await viewRes.json();
  340 |       expect(issue.priority).toBe(1);
  341 |     });
  342 | 
  343 |     test("updates assignee", async ({ request }) => {
  344 |       const response = await request.patch(
  345 |         `http://localhost:3001/api/issues/${testIssueId}`,
  346 |         { data: { assignee: "test-user" } }
  347 |       );
  348 |       expect(response.status()).toBe(200);
  349 | 
  350 |       const viewRes = await request.get(
  351 |         `http://localhost:3001/api/issues/${testIssueId}`
  352 |       );
  353 |       const issue = await viewRes.json();
  354 |       expect(issue.assignee).toBe("test-user");
```