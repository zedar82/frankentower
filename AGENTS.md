# FRANKENTOWER project instructions

- Follow `docs/design.txt` and the newer `docs/visual-direction.txt`. The visual direction requires pixel-art arenas and genuinely spatial combat; it supersedes the original room-geometry deferral. Community publishing remains deferred.
- Follow `docs/ui-expectations.md` for the planned UI pass: deliberate phone/desktop layouts, no page or panel scrolling in core views (including expanded equipment and inspection), tabs/pages for overflow, and the combat log as the explicit scrolling exception. A limited satchel is agreed; eight spaces is the initial proposal. Any capacity limit must validate complete transfers and displaced surgery equipment in game rules before mutation.
- **Never make this game public or submit it to a game jam without Daniel's explicit permission.** Private/unlisted development uploads are allowed. Do not use `rundot deploy --public` or `rundot game set-public` without that permission.
- Git author and committer: `Daniel Andersen <zedar@zedar.org>`. Use `~/.ssh/github.key` with `IdentitiesOnly=yes` when GitHub SSH access is needed. Permission to commit does not imply permission to push.
- Keep hosted persistence on the RUN SDK. `src/offline-storage.ts` is development-only and must stay excluded from production.
- Until the game is public, incompatible development saves may be wiped or invalidated. Do not add save migrations or backward-compatibility code; reset incompatible saves instead.
- Keep equipment content declarative and player/enemy combat on the same deterministic engine. Preserve branch-local instance ancestry and own-hit passive effects.
- Follow `docs/architecture.md` for module boundaries and ability authoring. Equipment, limb abilities, and set bonuses share the ability/effect vocabulary; keep named content exceptions out of combat.
- Run `npm test` and `npm run build` for gameplay changes. Browser test scripts require their respective Vite servers. Use the existing checks; do not invent mirror tests for cosmetic changes.
- Never commit `.env.local` or RUN session credentials. Runtime text generation is intentionally disabled in `rundot/textGen.config.json`.
