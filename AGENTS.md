# FRANKENTOWER project instructions

- Follow the supplied design in `docs/design.txt`. Later addenda take precedence; community publishing and room geometry are deferred from the first pass.
- **Never make this game public or submit it to a game jam without Daniel's explicit permission.** Private/unlisted development uploads are allowed. Do not use `rundot deploy --public` or `rundot game set-public` without that permission.
- Git author and committer: `Daniel Andersen <zedar@zedar.org>`. Use `~/.ssh/github.key` with `IdentitiesOnly=yes` when GitHub SSH access is needed. Permission to commit does not imply permission to push.
- Keep hosted persistence on the RUN SDK. `src/offline-storage.ts` is development-only and must stay excluded from production.
- Keep equipment content declarative and player/enemy combat on the same deterministic engine. Preserve branch-local instance ancestry and own-hit passive effects.
- Run `npm test` and `npm run build` for gameplay changes. Browser test scripts require their respective Vite servers. Use the existing checks; do not invent mirror tests for cosmetic changes.
- Never commit `.env.local` or RUN session credentials. Runtime text generation is intentionally disabled in `rundot/textGen.config.json`.
