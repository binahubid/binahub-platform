# Local UI fixture

Uses actual AMS layouts/components with synthetic auth and content, not a
production route or an authentication workaround. Never mount these mocks into
`apps/web/src` or deploy the preview as an application.

Run the already-installed Vite CLI from the sibling app-binahub checkout:

```
node node_modules/vite/bin/vite.js --config ../binahub-platform/scripts/ui-preview/vite.config.mts
```

The config reads its Vite/React test runtime from that sibling package.json, or
the absolute `AMS_UI_RUNTIME` package.json path. It does not install dependencies
or load project environment files. Loopback port 4322 only. Open `/`, `/?reviewer`
or `/?associate`. The companion app preview uses 4318 `/unslop.html`.

Run `node scripts/test-unslop-workspaces-ui.mjs after` from app-binahub with both
previews running. Browser intercepts API reads, blocks writes and external URLs;
does not call notification mutation actions. Screenshots stay in app's ignored
`tmp/unslop-workspaces-after`. This tests shared UI, not real auth/data or all
individual route content. Normal AMS build/type/lint remain required.
