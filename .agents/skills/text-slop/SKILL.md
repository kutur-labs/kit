---
name: text-slop
description: Write or edit concise technical prose in READMEs, documentation, code comments, AGENTS.md and agent skills. Use when drafting those texts or removing filler, hype and generic AI wording. Does not cover code refactoring or visual design.
---

# Text cleanup

Preserve the author's meaning, facts and voice. Edit only the requested text.

- Lead with the useful fact or instruction. Remove introductions that merely announce the subject, repeated summaries and conversational closers.
- Replace promotional claims with concrete behavior. Delete unsupported claims; do not invent measurements, guarantees or examples to make prose sound specific.
- Prefer ordinary verbs that say what happens, such as “merged,” “deployed” or “approved.” `@kutur-kit/oxc` reports a fixed list of vague words and dashes used as punctuation: the `kit/comment-prose` lint rule in comments and `pnpm exec kit-prose <file>` in Markdown. Each message names the fix. Run `kit-prose` on drafts that no check covers, and judge other words in context.
- Omit Oxford commas. Put a literal use of a reported word or dash, such as an identifier or a command, in a code span.
- Keep technical terms, qualifications and warnings needed for accuracy. Shorter is not better if it changes the meaning.
- Package READMEs explain exports, usage, requirements and limitations. Omit monorepo details and the history of how the package was built.
- Do not restate configuration as prose, such as listing enabled lint rules. Document how to use it and any constraints the code does not explain.
- For agent instructions and context pointers, delete any sentence that does not change agent behavior against the default, and lead each skill description or pointer with its trigger, one trigger per case.
- Comments explain constraints, decisions and non-obvious behavior. Remove decorative banners and obvious narration; preserve contracts, safety reasoning, useful issue links and licenses. Do not alter code or executable directives during prose cleanup.
- Use examples only when they resolve a likely misunderstanding. Keep identifiers, commands, URLs and quoted text intact unless their correction is requested.

Reread the result for lost meaning and unsupported claims. Return the edited text or a brief change summary as appropriate. Do not add scores, mandatory reports or a new explanation of the cleanup process.
