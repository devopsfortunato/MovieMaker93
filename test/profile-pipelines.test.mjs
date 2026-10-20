import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const blogWorkflow = await readFile(
  new URL("../.github/workflows/blog-post-workflow.yml", import.meta.url),
  "utf8",
).then((content) => content.replaceAll("\r\n", "\n"));

test("README links to the requested X account", () => {
  assert.match(readme, /\(https:\/\/x\.com\/devopsfortunato\)/);
});

test("profile views badge uses a counter GitHub's image proxy can fetch", () => {
  assert.match(readme, /https:\/\/hits\.sh\/github\.com\/MovieMaker93\.svg/);
  assert.doesNotMatch(readme, /komarev\.com/);
});

test("blog updater uses the local script", () => {
  assert.match(blogWorkflow, /node scripts\/update-blog-posts\.mjs/);
  assert.doesNotMatch(blogWorkflow, /alfonsofortunato\.com\/index\.xml/);
});

test("profile workflow runs each updater once before committing with a scoped token", () => {
  const blogCommand = "run: node scripts/update-blog-posts.mjs";
  const starCommand = "run: node scripts/update-project-stars.mjs";
  const commitStep = "      - name: Commit README";

  assert.match(blogWorkflow, /^  update-profile-content:/m);
  assert.equal(blogWorkflow.split(blogCommand).length - 1, 1);
  assert.equal(blogWorkflow.split(starCommand).length - 1, 1);
  assert.equal(blogWorkflow.split("git commit").length - 1, 1);
  assert.equal(blogWorkflow.split("GITHUB_TOKEN:").length - 1, 1);
  assert.ok(blogWorkflow.indexOf(blogCommand) < blogWorkflow.indexOf(starCommand));
  assert.ok(blogWorkflow.indexOf(starCommand) < blogWorkflow.indexOf(commitStep));
  assert.match(
    blogWorkflow,
    /    env:\n      GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/,
  );
});

test("commit step retries with fresh main content when a push is rejected", () => {
  assert.match(blogWorkflow, /for attempt in 1 2 3; do/);
  assert.match(blogWorkflow, /if git push; then/);
  assert.match(blogWorkflow, /git fetch origin main/);
  assert.match(blogWorkflow, /git reset --hard origin\/main/);
  assert.match(
    blogWorkflow,
    /node scripts\/update-blog-posts\.mjs\n\s+node scripts\/update-project-stars\.mjs/,
  );
});
