# A8 · Admin UI refresh — code review

Branch `feat/admin-08-ui-refresh`, `/code-review` run 2026-10-26. Fixes are on the same branch.

| # | File | Finding | Status |
|---|------|---------|--------|
| R1 | `features/users/fields.tsx` | Esc in the farm combobox also closed the surrounding dialog and lost the input | Fixed: Esc with the list open is stopped there |
| R2 | `styles/theme.css` | `--app-input` (`#b7c2b4` / `#3d453a`) fell below 3:1 for field outlines (WCAG 1.4.11) | Fixed: `#949085` / `#646d5f` |
| R3 | `components/ui/Button.tsx`, `Segmented.tsx` | Buttons replaced the solid focus outline with a 25 % ring, too faint | Fixed: buttons and tabs keep the global 2 px `--app-focus` outline; only fields use border + ring |
| R4 | `features/users/UserPage.tsx` | Auth lowercases emails, so a saved mixed-case email stayed "changed" | Fixed: compared lowercased |
| R5 | `features/account/AccountPage.tsx` | Own passwords stayed in state after success or cancel | Fixed: cleared on success and on close |
| R6 | `features/users/fields.tsx` | ArrowDown on an empty list set the active option to -1 | Fixed: clamped at 0 |
| R7 | `components/ui/Dialog.tsx` | A close requested by the parent fired `onClose` a second time | Fixed: `onClose` only for Esc / X |
| R8 | `features/users/fields.tsx` | Second 300 ms debounce besides `SearchInput` | Skipped: `SearchInput` syncs with the URL, the combobox does not; extract a hook if a third appears |
| R9 | `features/users/UsersPage.tsx` | Link-as-button copied the md size classes | Fixed: `buttonSizes` exported and used |
| R10 | `features/organizations/OrganizationPage.tsx` | Template string instead of `cx` | Fixed |
