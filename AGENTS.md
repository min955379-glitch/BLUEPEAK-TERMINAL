# AGENTS.md — Standing Rules for BluePeak Terminal work

These rules apply to **every** turn in this project, whether or not the user
repeats them in the prompt. They are deliberately short and absolute.

## R1 — Big files and large artifacts go to Google Drive

- Anything large or non-code (release ZIPs, exports, screenshots, PDFs, data
  dumps, bundles, backups, archives over roughly ~5 MB, or any file that would
  bloat the Git repository) is stored in Google Drive, not committed to Git.
- Upload with the `google_drive` connector (`upload_file` for ≤ 100 MB, or
  `initiate_resumable_upload` for bigger streams), keep one shared folder per
  project, and hand the user the Drive link instead of dumping bytes in chat.
- Git stays clean: no build output, `node_modules`, `.env`, `.vercel`, ZIPs or
  datasets in the repository. Existing ignore conventions still apply.

## R2 — All coding happens on GitHub, through this repository

- Source of truth is GitHub `min955379-glitch/BLUEPEAK-TERMINAL`, branch
  `arena/ebb4bb29-bluepeak-terminal`. All code changes are made in this
  worktree, committed to this branch, and pushed only to this branch.
- Never create/switch/push other branches. Pull requests are opened from this
  branch only, with `gh`.
- Reference code by GitHub permalink when sharing where something lives.

## R3 — Use every connected resource proactively

- Connected apps: **google_drive, gmail, google_calendar, google_docs,
  google_sheets, google_slides, linear, notion, supabase, vercel**, plus
  `git`/`gh` for GitHub.
- The assistant chooses the right tool on its own, without being told: Drive for
  storage, Docs/Sheets/Slides for human-readable deliverables, Gmail for mail,
  Calendar for scheduling, Notion/Linear for notes and tasks, Supabase for
  database/Edge Function state, Vercel for deployment status, GitHub for code.
- Do not ask "should I use X?" when X is already connected and obviously
  relevant — just use it and say what was done.

## R4 — Safety guardrails (unchanged, non-negotiable)

- Never expose secrets (service-role keys, passwords, tokens) in code, chat,
  Drive documents, or the repository.
- Do not alter authentication, registration, Admin Portal backend logic,
  RLS policies, or Supabase Edge Functions without explicit instruction.
- Do not deploy, migrate production, or delete production data without explicit
  authorization. Verify, then report honestly — never claim real-device,
  authenticated, or timed acceptance that was not actually run.
