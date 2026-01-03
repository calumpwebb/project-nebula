---
name: beads-todo
description: Create todos in beads with smart semantic duplicate detection - prevents creating todos that match existing ones even when worded differently
---

# Beads Todo Creator

Create todos in beads (bd) with intelligent duplicate detection that catches semantically similar issues, not just exact matches.

## Relationship to `bd duplicates`

| Tool            | Detection Type      | Use When                                 |
| --------------- | ------------------- | ---------------------------------------- |
| `bd duplicates` | Exact content hash  | Identical issues (copy-paste duplicates) |
| This skill      | Semantic similarity | Different wording, same intent           |

The built-in `bd duplicates` command finds issues with identical content hashes. This skill complements it by catching semantically equivalent issues that are worded differently (e.g., "add tests for auth" vs "write authentication tests").

## Triggers

- `create todo: {description}` - Create a new todo with duplicate check
- `bd todo: {description}` - Create beads todo with semantic matching
- `add task: {description}` - Add task to beads with similarity check
- `new issue: {description}` - Create issue with duplicate prevention
- `track: {description}` - Track work item with similarity check

## Quick Reference

| Step | Action                                                       |
| ---- | ------------------------------------------------------------ |
| 1    | Fetch existing open/in_progress/blocked issues via `bd list` |
| 2    | Semantically compare proposed todo against all existing      |
| 3    | Report matches with similarity reasoning                     |
| 4    | Create only if no duplicates (or user confirms)              |

## Process

### Step 1: Fetch Existing Issues

Run these commands separately to get all potentially conflicting issues:

```bash
bd list --status open --json
bd list --status in_progress --json
bd list --status blocked --json
```

Parse each JSON output and merge the results. Each issue has:

- `id`: Issue identifier (e.g., NEBULA-abc)
- `title`: Issue title
- `description`: Detailed description
- `status`: open, in_progress, blocked, closed
- `issue_type`: bug, feature, task, epic, chore

**Why these statuses?**

- `open`: Work not yet started - most likely to conflict
- `in_progress`: Active work - definitely relevant
- `blocked`: Paused but not abandoned - still counts as active

We exclude `closed` issues as they represent completed work. If reopening is intended, that's a distinct action.

### Step 2: Semantic Similarity Analysis

For each existing issue, evaluate semantic similarity to the proposed todo.

**Similarity Criteria:**

| Aspect        | Weight | Description                                                 |
| ------------- | ------ | ----------------------------------------------------------- |
| Core Intent   | High   | Does it solve the same problem?                             |
| Action Type   | Medium | Same verb category (add/create, fix/repair, update/modify)? |
| Target Entity | High   | Same component/feature/area?                                |
| Scope         | Medium | Similar scope of work?                                      |

**Similarity Levels:**

| Level               | Score   | Action                            |
| ------------------- | ------- | --------------------------------- |
| Exact Match         | 90-100% | Block creation, show existing     |
| High Similarity     | 70-89%  | Warn user, require confirmation   |
| Moderate Similarity | 50-69%  | Inform user, proceed with caution |
| Low Similarity      | <50%    | Proceed with creation             |

### Why These Thresholds?

| Threshold  | Rationale                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **90%+**   | Near-certain duplicate. Different wording but same task. Default to blocking - false positives here are rare and easy to override.       |
| **70-89%** | High confidence overlap. Usually the same work but context might differ. Require explicit confirmation to prevent accidental duplicates. |
| **50-69%** | Related work. Worth knowing about but probably distinct. Inform user but don't block - false positives would be annoying at this level.  |
| **<50%**   | Independent work. Similarity is coincidental (shared keywords, common patterns). Proceed without friction.                               |

These thresholds balance false positives (annoying interruptions) vs false negatives (duplicate work). Adjust based on team preference.

### Semantic Matching Examples

These pairs should be detected as HIGH SIMILARITY (70%+):

| Proposed                   | Existing                      | Why Similar                 |
| -------------------------- | ----------------------------- | --------------------------- |
| "add tests for auth"       | "write authentication tests"  | Same intent, same target    |
| "fix login bug"            | "repair authentication issue" | Same action type, same area |
| "update user profile page" | "modify profile UI"           | Same target entity          |
| "add CI pipeline"          | "set up GitHub Actions CI"    | Same end goal               |
| "improve performance"      | "optimize speed"              | Same intent                 |

These pairs are NOT duplicates (different intent):

| Proposed             | Existing              | Why Different     |
| -------------------- | --------------------- | ----------------- |
| "add login button"   | "add logout button"   | Different actions |
| "test auth frontend" | "test auth backend"   | Different scope   |
| "add user table"     | "add user validation" | Different targets |

### Step 3: Report Findings

If potential duplicates found, present them clearly:

```
POTENTIAL DUPLICATES FOUND

Proposed: "add authentication tests"

Similar existing issues:

1. [HIGH - 85%] NEBULA-abc: "write tests for auth module"
   - Same intent: both add tests for authentication
   - Status: open

2. [MODERATE - 60%] NEBULA-xyz: "improve test coverage"
   - Related: tests, but broader scope
   - Status: in_progress

Options:
a) Cancel creation (recommended if duplicate)
b) Create anyway (if genuinely different)
c) Add as child/related to existing issue
```

### Step 4: Create or Abort

**If no duplicates (similarity < 50%):**

```bash
bd create "Your todo title" -d "Description" -t task
```

**If duplicates found:**

- Present the matches
- Ask user to confirm one of:
  - Cancel (default if HIGH similarity)
  - Create anyway (must explicitly confirm)
  - Link to existing issue instead

## Command Reference

| Command                                        | Purpose                |
| ---------------------------------------------- | ---------------------- |
| `bd list --status open --json`                 | Get open issues        |
| `bd list --status in_progress --json`          | Get in-progress issues |
| `bd list --status blocked --json`              | Get blocked issues     |
| `bd create "title" -d "desc" -t type`          | Create new issue       |
| `bd show ISSUE-ID`                             | View issue details     |
| `bd update ISSUE-ID --deps "related:OTHER-ID"` | Link related issues    |

## Anti-Patterns

| Avoid                                | Why                                 | Instead                              |
| ------------------------------------ | ----------------------------------- | ------------------------------------ |
| Exact string matching only           | Misses "add tests" vs "write tests" | Use semantic analysis                |
| Checking only titles                 | Descriptions often clarify intent   | Check both title and description     |
| Auto-creating without check          | Defeats the purpose                 | Always analyze first                 |
| Ignoring blocked issues              | Blocked work is still active        | Check open, in_progress, AND blocked |
| Binary yes/no matching               | Similarity is a spectrum            | Use percentage-based scoring         |
| Skipping the check for "quick" todos | Quick todos become duplicate debt   | Always check, even for small items   |

## Verification

Before completing:

- [ ] Fetched open, in_progress, and blocked issues
- [ ] Analyzed semantic similarity for all issues
- [ ] Presented any matches with clear reasoning
- [ ] Got user confirmation before creating if matches found
- [ ] Used correct bd create syntax with proper flags

## Examples

### Example 1: Clear Duplicate

User: "create todo: add unit tests for authentication"

```bash
bd list --status open --json
bd list --status in_progress --json
bd list --status blocked --json
```

Found: `NEBULA-xyz: "write authentication tests"`

Response:

```
HIGH SIMILARITY (88%) with existing issue:

NEBULA-xyz: "write authentication tests"
Description: "Add comprehensive unit tests for the auth module..."
Status: open

This appears to be the same task. The existing issue covers:
- Unit tests for authentication (matches your request)

Recommended: Use existing issue NEBULA-xyz instead of creating duplicate.

Create anyway? [y/N]
```

### Example 2: No Duplicates

User: "create todo: add dark mode toggle"

```bash
bd list --status open --json
bd list --status in_progress --json
bd list --status blocked --json
```

No similar issues found.

```bash
bd create "Add dark mode toggle" -t feature -d "Add a toggle in settings to switch between light and dark themes"
```

Response:

```
No similar issues found. Created:
NEBULA-abc: "Add dark mode toggle" (feature, open)
```

### Example 3: Borderline Case

User: "create todo: improve API response times"

Found:

- `NEBULA-123: "Optimize database queries"` (55% similar)
- `NEBULA-456: "Add caching layer"` (52% similar)

Response:

```
MODERATE SIMILARITY with related issues:

1. [55%] NEBULA-123: "Optimize database queries"
   - Related: Both aim to improve performance
   - Different: Your focus is API-level, existing is DB-level

2. [52%] NEBULA-456: "Add caching layer"
   - Related: Caching improves response times
   - Different: Your request is broader

These are related but distinct. Proceeding with creation.

bd create "Improve API response times" -t task -d "..."

Created: NEBULA-789
Consider linking: bd update NEBULA-789 --deps "related:NEBULA-123,related:NEBULA-456"
```

## Extension Points

1. **Threshold tuning**: Adjust 50/70/90 thresholds based on team preference
2. **Status filtering**: Add/remove statuses to check (e.g., include recently closed)
3. **Type matching**: Weight similarity higher when issue types match (bug vs bug)
4. **Priority consideration**: Factor in priority when determining if truly duplicate

## MCP Alternative

If the beads MCP server is configured, you may use MCP tools instead of CLI commands. The semantic analysis process remains identical - only the data fetching mechanism changes.
