---
"@kutur-kit/oxc": minor
---

`/effect` warns on runtime globals that have an Effect service (`console`, `Date`, `fetch`, `Math.random`, timers, `crypto.randomUUID` and `process.env`) and on `Context.Service` used as a value instead of a class.
