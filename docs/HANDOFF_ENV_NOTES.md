# Handoff: Environment Notes

## Why this exists
This repo has two separate environment axes:

1. **Runtime CloudBase env**
   - Comes from `.env.development` / `.env.production`
   - Compiled into `__WEAPP_CLOUD_ENV_ID__`
   - Used by `Taro.cloud.init()` at runtime

2. **DevTools / CloudBase console env**
   - Comes from `project.config.json -> cloudenvironment`
   - Affects what environment DevTools shows by default and where console-driven cloud deployments / database views may land

If these two are not checked explicitly, it is easy to think you are testing prod while still looking at dev console state.

## Current explicit switching commands
```bash
npm run use:devtools:dev
npm run use:devtools:prod
```

## Current build commands
### dev local watch
```bash
npm run dev:weapp:dev
```

### prod build verification
```bash
npm run build:weapp:prod
```

## Important warning
Changing `.env.production` or `.env.development` does **not**:
- deploy cloud functions
- copy function env vars
- copy indexes
- copy collection permissions
- copy admin rows

Those remain manual console state unless later automated.

## Minimum prod verification before trusting a prod test
1. Confirm runtime logs in `src/app.ts` show prod env id
2. Confirm DevTools current environment is prod
3. Confirm key functions exist in prod
4. Confirm prod function env vars exist
5. Confirm prod collections / permissions / admin rows exist

## Most likely future foot-gun
The easiest mistake is:
- build/runtime already points to prod
- but DevTools console is still looking at dev

That creates false conclusions about deploy status and data state.
