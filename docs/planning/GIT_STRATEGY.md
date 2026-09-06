# SafeSathi — Git Branch Strategy

## 1. Branching Model

A Git-Flow-inspired model, scoped to a single monorepo:

```
main                    → always deployable; every commit is a tagged release
 └── develop             → integration branch; all feature branches merge here first
      ├── feature/backend-auth-middleware
      ├── feature/mobile-sos-trigger
      ├── feature/ai-vosk-keyword-spotting
      ├── feature/admin-reports-queue
      └── ...
 └── release/v0.4.0       → branched from develop when a phase is feature-complete;
                             only bugfixes land here before merging to main + develop
 └── hotfix/sos-push-delivery-bug  → branched from main for urgent production fixes,
                                     merged back into both main and develop
```

- `main` is protected: no direct pushes, merges only via reviewed PR from
  `release/*` or `hotfix/*`.
- `develop` is protected: no direct pushes, merges only via reviewed PR
  from `feature/*`.
- Each phase (1–10) roughly maps to one `release/vX.Y.0` branch, so the
  history reads as a clean changelog matching the roadmap.

## 2. Branch Naming

`type/short-scope-description`, all lowercase, hyphen-separated:

| Type | Used for |
|---|---|
| `feature/` | New functionality |
| `fix/` | Bug fixes on `develop` |
| `hotfix/` | Urgent fixes on `main` |
| `chore/` | Tooling, config, dependency bumps |
| `docs/` | Documentation-only changes |
| `test/` | Test-only additions |

Scope prefix indicates which service it touches, e.g.
`feature/backend-sos-trigger`, `feature/mobile-live-location`,
`feature/ai-tone-analysis`, `feature/admin-heatmap-view`.

## 3. Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/), so the
history doubles as a changelog:

```
<type>(<scope>): <short summary>

[optional body]
[optional footer, e.g. Closes #12]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
Scope: `backend`, `mobile`, `ai`, `admin`, `docs`, `repo`.

Examples:
```
feat(backend): add SOS trigger endpoint with contact notification
fix(mobile): correct SafeScore gauge color thresholds
docs(architecture): document auto-SOS sequence diagram
test(ai): add unit tests for tone analysis scream probability
chore(repo): update dependency list for Phase 2
```

## 4. Pull Request Checklist

Every PR into `develop` or `main` must:
- [ ] Reference the roadmap phase/milestone it contributes to
- [ ] Pass lint (`npm run lint` / equivalent) and type-check
- [ ] Pass all existing tests, and add new tests for new logic
- [ ] Update relevant docs in `docs/` if the change affects architecture, API surface, or schema
- [ ] Be reviewed by at least one other team member before merge (self-review documented if solo)

## 5. CI Gate (added in Phase 8, enforced from then on)

Every PR triggers: install → lint → type-check → unit tests → API tests.
A release branch cannot be merged to `main` with a red pipeline.

## 6. Tags & Releases

Each `release/*` branch merge to `main` is tagged `vMAJOR.MINOR.0`
(e.g. `v0.2.0` = Phase 2 complete), so `git log --tags` on `main` alone
tells the story of the roadmap.
