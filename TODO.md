# TODO - U6 sign-in gating

- [ ] Add first-screen modal that blocks list creation until user chooses:
  - Sign in with Google (enables Google import + adds today list after OAuth)
  - Continue without sign in (disables Google import)
- [ ] Remove/disable the existing “Connect & Import Today” button.
- [ ] Gate list creation + list editor UI behind auth choice.
- [ ] Ensure after OAuth redirect (googleConnected=1), if user is signed-in choice, fetch today and add list; otherwise do not add list.
- [ ] Restart React dev server and verify:
  - Sign-in screen appears first
  - List creation disabled until choice
  - Google list only appears for users who chose sign in.

