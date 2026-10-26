# B7 · Code review

Branch `fix/b7-api-gaps`, reviewed with `/code-review` on 2026-10-25. All findings fixed on the same branch.

| # | Finding | Fix |
|---|---------|-----|
| R1 | `private.co_member_ids()` still counted co-members of a deleted organization, so its former members kept reading each other's profiles | Rewritten on top of `my_organization_ids()`; test "nor the profiles of people they only shared that organization with" |
| R2 | A deleted parent and a broken link (other organization, other hive, missing) shared `parent_mismatch`, and the app was told to drop it, hiding client bugs | New detail `parent_deleted` ("El registro relacionado fue eliminado."); `parent_mismatch` ("…no existe o es de otra organización.") stays **Requiere atención**. Existing tests on deleted apiaries updated |
| R3 | Dropping every live write under a deleted parent would silently lose an inspection or photo recorded offline | `docs/api.md`: drop only an edit of a row the server already has; a row never pushed goes to **Requiere atención** |
| R4 | The live-organization join was written in `my_organization_ids`, `is_member` and `has_role` (AGENTS.md: the second copy is the extraction) | The rule lives only in `my_organization_ids`; `is_member`, `has_role` and `co_member_ids` go through it |
| R5 | `docs/api.md` said every write to a deleted organization gets `42501`, but a plain `PATCH` returns empty | Wording: inserts and upserts get `42501`; a `PATCH` changes nothing and returns empty (Writes refused by RLS) |
