---
name: text-slop
description: Write or edit concise technical prose in READMEs, documentation and code comments. Use when drafting those texts or removing filler, hype and generic AI wording. Does not cover code refactoring or visual design.
---

# Text cleanup

Preserve the author's meaning, facts and voice. Edit only the requested text.

- Lead with the useful fact or instruction. Remove introductions that merely announce the subject, repeated summaries and conversational closers.
- Replace promotional claims with concrete behavior. Delete unsupported claims; do not invent measurements, guarantees or examples to make prose sound specific.
- Prefer ordinary verbs: “use” over “leverage,” “supports” over “empowers.” Judge words in context rather than enforcing a blacklist.
- Avoid dashes as sentence punctuation, including em dashes, and omit Oxford commas. Use periods, parentheses or rephrase instead. Preserve necessary hyphens in technical terms, identifiers and commands.
- Avoid vague engineering buzzwords: “stamp/stamped,” “land/lands/landed,” “unlock,” “supercharge,” “seamless” and “battle-tested.” Say what actually happens: “when this merges,” “after deployment,” “approved” or “recorded,” as appropriate. Keep literal technical uses such as timestamps or a documented API identifier.
- Keep technical terms, qualifications and warnings needed for accuracy. Shorter is not better if it changes the meaning.
- Package READMEs explain exports, usage, requirements and limitations. Omit monorepo details and the history of how the package was built.
- Do not restate configuration as prose, such as listing enabled lint rules. Document how to use it and any constraints the code does not explain.
- Comments explain constraints, decisions and non-obvious behavior. Remove decorative banners and obvious narration; preserve contracts, safety reasoning, useful issue links and licenses. Do not alter code or executable directives during prose cleanup.
- Use examples only when they resolve a likely misunderstanding. Keep identifiers, commands, URLs and quoted text intact unless their correction is requested.

Reread the result for lost meaning and unsupported claims. Return the edited text or a brief change summary as appropriate. Do not add scores, mandatory reports or a new explanation of the cleanup process.
