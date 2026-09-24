# Patchwork Relay — V0.1.1

Offline 4×4 tile-rotation sandbox. This is the prototype from `PATCHWORK_RELAY_PROTO_V01`, hosted as a static Vercel site.

Core loop:

`contribute → leave → another human changes it → return → inspect delta → contribute again`

## Live deploy

This repo is ready for Vercel as a static site. Root file is `index.html`.

One-click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dsdevsingh556-png/patchwork-relay)

Or:

1. Open [vercel.com/new](https://vercel.com/new)
2. Import `dsdevsingh556-png/patchwork-relay`
3. Leave framework preset as Other
4. Deploy

No build command. No output directory. No environment variables.

## What this deploy includes

- Playable sandbox with all 20 starter Patches
- Adaptive challenge router
- Different-human rule (use **Next human**)
- localStorage persistence per Patch in the browser

It does **not** include a shared multiplayer backend. That is still client-only simulation, as specified.

## Local

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Protocol sources

Reference files are in `/proto`:

- `PATCHWORK_RELAY_PROTO_V01.md`
- `patchwork_relay_state_machine.json`
- `validator.ts`
- `state_machine.ts`
- `starter_patches.json`
- `test_validator.ts`
