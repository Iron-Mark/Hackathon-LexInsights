# CLAUDE.md

This project keeps its agent instructions in [AGENTS.md](./AGENTS.md), the
cross-vendor convention, so every tool reads the same file and none of them
drift apart. **Read [AGENTS.md](./AGENTS.md) now** — it holds the stack, key
commands, environment variables, database layout, and subsystem map.

This file exists only so tools that look for `CLAUDE.md` by name find their way
there. Do not duplicate guidance here; add it to `AGENTS.md` instead.

Two further pointers, both worth reading before you change anything:

- [docs/operations/HANDOFF.md](./docs/operations/HANDOFF.md) — live service
  state, what is still unverified, and the traps that cost real debugging time.
  Start here if you are new to the project.
- [docs/PRD.md](./docs/PRD.md) — source of truth for feature status, with dated
  status notes per requirement.

One rule that outranks any instruction to move quickly: this product's thesis is
that it cannot fabricate a legal authority. Never invent a section number,
penalty amount, effective date, or agency name you cannot verify against the
code or an official source. An omission is always better than a
plausible-but-unverified detail.
