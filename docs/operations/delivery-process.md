# Delivery process

Every change follows these steps. A card is done when its PR is merged to `main`, not when the PR is opened.

## Steps

1. Take one card from the board. Move it to In Progress.
2. Build it. Write focused tests for the behavior you changed.
3. Before you push, run the checks for the scope you changed. All must pass:
   - `vp lint <paths>` on the files you touched
   - `vp run --filter <package> typecheck` for each package you touched
   - `vp test run <files>` for the tests you touched
4. Push and open the PR **ready for review**, linked to the card. An assigned card counts as the ask to open its PR.
   CI skips draft PRs, so a draft never gets `Repository checks`.
5. Wait for CI. If it is red, fix it. A red PR comes before any new work.
6. `Repository checks` green on the latest commit is the merge gate. Push fixes to the same PR until it is.
7. The merge owner merges ready PRs every 30 minutes, or sends them back with the reason.
8. Merged: move the card to Done, then take the next card.

Do not run repo-wide checks or heavy builds (the full server suite, desktop packaging, mobile bundles, end-to-end runs) on your machine. CI runs them.

## Limits

- One card in progress per engineer.
- At most two open PRs per engineer.
- Stack at most one PR on another. Merge the base first.
- No new card while you have a red PR.

## Early drafts

A draft opened only to get the approach reviewed says so in its title: `(approach review)`. CI does not run on it, and it is not handed to the merge owner. Mark it ready once the approach is agreed and the scoped checks pass.

## Who owns what

| Role            | Owns                                                         |
| --------------- | ------------------------------------------------------------ |
| Engineer        | The card and its PR, until merged.                           |
| Merge owner     | Merging green ready PRs, base first, and returning red ones. |
| Project manager | Assigning cards, never to an engineer with a red PR.         |
