---
name: commit
description: Write git commit messages with mandatory ticket references. Ensures all work is tracked in beads. Analyzes staged changes, verifies ticket context, and generates conventional commit messages.
metadata:
  version: 1.0.0
  model: claude-opus-4-5-20251101
---

# Commit

Write git commit messages that always include ticket references.

---

## Quick Start

```
/commit
```

That's it. The skill gathers context, finds your ticket, and commits.

---

## Triggers

- `/commit` - Create a commit with proper message
- `commit this` - Natural language activation
- `commit my changes` - Commit staged/unstaged changes
- `write commit message` - Generate message for review

---

## Quick Reference

| Step       | Action                                      | Failure Mode                 |
| ---------- | ------------------------------------------- | ---------------------------- |
| 1. Gather  | `git status`, `git diff`, recent commits    | No staged changes            |
| 2. Ticket  | Find ticket in context or prompt            | No ticket → must create one  |
| 3. Type    | Determine feat/fix/chore/docs/refactor/test | Unclear → ask user           |
| 4. Message | Generate concise WHY-focused message        | -                            |
| 5. Commit  | Execute with HEREDOC format                 | Hook rejects → fix and retry |

---

## The Rule

**Every commit MUST have a ticket.** No exceptions.

```
Commit without ticket?
    │
    └── STOP. Create ticket first: bd create "description"
```

---

## Commit Format

```
type(TICKET-XXX): concise description of WHY

Optional body explaining context if needed.
```

**Types:**

| Type       | When                                   |
| ---------- | -------------------------------------- |
| `feat`     | New functionality                      |
| `fix`      | Bug fix                                |
| `chore`    | Maintenance, deps, config              |
| `docs`     | Documentation only                     |
| `refactor` | Code restructuring, no behavior change |
| `test`     | Adding or fixing tests                 |
| `style`    | Formatting, no logic change            |

**Examples:**

```
feat(NEBULA-123): add dark mode toggle to settings

fix(NEBULA-456): prevent crash when API returns null

chore(NEBULA-789): update dependencies to latest versions

docs(NEBULA-012): document authentication flow
```

**Multiple tickets** (when unavoidable):

```
fix(NEBULA-123, NEBULA-456): resolve shared validation bug
```

---

## Process

### 1. Gather Context

Run these commands to understand current state:

```bash
# What's changed?
git status

# What are the actual changes?
git diff --staged    # If files are staged
git diff             # If nothing staged yet

# What's the commit style?
git log --oneline -5
```

### 2. Find the Ticket

Check for ticket context:

1. **User mentioned it** → Use that ticket
2. **Recent work context** → Check `bd list --status in-progress -a $(whoami)`
3. **Not found** → Ask user or prompt to create one

```bash
# Show tickets assigned to current user
bd list --status in-progress

# Show a specific ticket
bd show NEBULA-XXX
```

**No ticket exists?**

```bash
bd create "Brief description of the work"
```

Use the returned ticket ID in the commit.

### 3. Determine Type

Match changes to commit type:

| Changes Include                      | Type       |
| ------------------------------------ | ---------- |
| New files, new exports, new features | `feat`     |
| Fixing broken behavior               | `fix`      |
| package.json, config files, CI       | `chore`    |
| Only .md files, comments             | `docs`     |
| Moving code, renaming, restructuring | `refactor` |
| Only test files                      | `test`     |

### 4. Write the Message

**Focus on WHY, not WHAT.**

| Bad              | Good                                                |
| ---------------- | --------------------------------------------------- |
| "update user.ts" | "validate email before submission"                  |
| "fix bug"        | "prevent duplicate form submissions"                |
| "add function"   | "calculate shipping costs for international orders" |

The diff shows WHAT changed. The message explains WHY.

### 5. Execute the Commit

Use HEREDOC format to preserve formatting:

```bash
git add -A  # or specific files
git commit -m "$(cat <<'EOF'
type(TICKET-XXX): concise message here
EOF
)"
```

For multi-line messages:

```bash
git commit -m "$(cat <<'EOF'
type(TICKET-XXX): concise summary

More context about why this change was needed.
Any important details for reviewers.
EOF
)"
```

---

## Anti-Patterns

| Avoid                                       | Why                              | Instead                              |
| ------------------------------------------- | -------------------------------- | ------------------------------------ |
| Commit without ticket                       | Loses traceability, hook rejects | Create ticket first with `bd create` |
| Generic messages ("fix bug", "update code") | No value in history              | Describe the WHY specifically        |
| Huge commits                                | Hard to review, risky to revert  | Small, focused commits               |
| Multiple unrelated changes                  | Unclear scope                    | One logical change per commit        |
| Ticket in body, not title                   | Harder to scan history           | Always in title: `type(TICKET):`     |

---

## Edge Cases

### No changes to commit

```
Nothing to commit. Check:
- Did you save your files?
- Are changes already committed?
- Did you mean to stage something?
```

### Commit hook rejects

The hook validates ticket format. If rejected:

1. Check ticket format matches `NEBULA-XXX`
2. Ensure ticket is in the parentheses, not the message body
3. Fix and run `git commit --amend` or new commit

### Work spans multiple tickets

Prefer splitting the commit. If truly inseparable:

```
fix(NEBULA-123, NEBULA-456): shared validation logic fix
```

### Amending a commit

Only amend if:

- The commit hasn't been pushed
- You made the original commit in this session

```bash
git commit --amend -m "$(cat <<'EOF'
type(TICKET-XXX): corrected message
EOF
)"
```

---

## Verification

Before completing:

- [ ] Ticket reference present in format `type(TICKET-XXX):`
- [ ] Commit type matches nature of changes
- [ ] Message describes WHY, not just WHAT
- [ ] Changes are focused (one logical unit)
- [ ] `git status` shows successful commit

---

## Related Commands

| Command             | Purpose                |
| ------------------- | ---------------------- |
| `bd create "desc"`  | Create new ticket      |
| `bd list`           | List tickets           |
| `bd show TICKET`    | Show ticket details    |
| `bd close TICKET`   | Close completed ticket |
| `git log --oneline` | View commit history    |

---

<details>
<summary><strong>Deep Dive: Conventional Commits</strong></summary>

The format follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

In this project, the scope IS the ticket:

```
type(TICKET): description
```

This enables:

- Automatic changelog generation
- Semantic versioning inference
- Ticket-to-commit traceability
- Clear history scanning

### Breaking Changes

For breaking changes, add an exclamation mark after the type:

```
feat(NEBULA-123): change API response format

BREAKING CHANGE: Response now returns array instead of object.
```

</details>

<details>
<summary><strong>Deep Dive: Why Tickets Matter</strong></summary>

Every piece of work needs a ticket because:

1. **Traceability**: Code changes link to requirements
2. **Context**: Future readers understand WHY
3. **Metrics**: Track velocity, find patterns
4. **Accountability**: Know who decided what
5. **Communication**: Stakeholders follow progress

A commit without a ticket is:

- Unplanned work (why wasn't it tracked?)
- Lost context (what was the goal?)
- Invisible effort (can't measure it)

**If work is worth doing, it's worth tracking.**

</details>
