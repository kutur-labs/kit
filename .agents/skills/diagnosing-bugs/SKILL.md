---
name: diagnosing-bugs
description: Use when a bug or performance regression still has an unclear cause after one look at the code, or when a first fix left the symptom in place. Reproduces the reported symptom with one command, tests ranked hypotheses against it and proves the fix. Not for bugs whose cause the error or code already shows, or for questions the user wants answered directly.
---

# Diagnosing bugs

- Read code and form provisional hypotheses only to aim the reproduction. Attempt no fix until one command fails on the reported symptom: the same error, value or timing, not a nearby failure such as a setup error. Show the command and its failing output.
- Make that command a test in the repo's test harness. When the failing input is unknown, search for one with a property test. When no test reaches the bug, script it against the running server or CLI, or replay a captured request or event through the code path.
- Control time and randomness, and replace only the services the bug does not involve, so each run gives the same verdict. A mock of the suspect logic, or a fake for the database, runtime or concurrency the bug needs, can only confirm your theory.
- For an intermittent failure, repeat the trigger and add load or concurrency until it fails within a few runs, then measure that rate. Count it fixed only after a clean streak three times the average runs per failure, such as 30 clean runs for a failure every 10 runs.
- For a performance regression, the reproduction is a repeatable timing or profile. Time it under `it.live` or outside the test runtime: `it.effect` installs `TestClock`, so Effect's clock stands still and `Effect.timed` reports zero. Record a baseline before changing code, repeat the same measurement after each change and trust only differences larger than run-to-run noise. Alternate baseline and candidate runs under the same workload. Before accepting a speedup, confirm the timed region still produces the correct output and finishes the work, with no new errors.
- When a known-good commit exists, run the command under `git bisect run` before reading history for suspects. Make the script exit 125 when a commit cannot install, build or run the command, so only the symptom marks a commit bad. For a known-good version or config, diff both states' output on one input. Keep the command and its harness untracked so every checkout keeps them.
- Keep the original reproduction and shrink a copy one cut at a time, rerunning after each and keeping a cut only if the same symptom remains, until removing any remaining input, caller, config or step loses the symptom.
- Before testing a cause, rank the plausible ones by likelihood and cost to test, each with a prediction that would rule it out. Show the list and continue without waiting for a reply.
- Change one variable per run. Revert each change a run disproves, including a failed first fix.
- After two failed fixes that share a premise, state that premise and run a check that tells it apart from an alternative before trying a third fix.
- Probe only where the open hypotheses predict different results. Tag every temporary probe with one fresh marker, such as `Effect.log("[DEBUG-<id>]", value)` with a new random `<id>`.
- Before concluding that a silent probe's path never ran, check that its output reaches you: the default minimum level `Info` drops `Effect.logDebug`, and under `it.effect` logs go to `TestConsole`, so read `TestConsole.logLines`.
- Turn the minimized reproduction into the regression test at a seam that runs the real pattern, with the callers, concurrency and services that trigger the bug. If no seam reaches it without mocking the defect away, write no shallower test and report the missing seam as a finding.
- Call the bug fixed only after you have seen the original, unminimized reproduction pass.
- If you cannot reproduce the bug, say what you tried and ask for what would reproduce it: access to the failing environment, a redacted capture or approval for temporary production logging. Fix it without a reproduction only if the user asks, and label that fix unverified.
- Before reporting the fix or committing, delete every probe and throwaway harness, and grep for the marker to confirm none is left. Name the confirmed cause and the refuted hypotheses in your report and any commit body.
- Write `<REDACTED>` for every secret, token, cookie and personal detail in commands, outputs and artifacts you show or commit, fixtures included. Pass credentials through environment variables so commands carry none.
