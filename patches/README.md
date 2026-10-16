# Drizzle Effect 4 compatibility

`drizzle-orm@1.0.0-rc.4.patch` is copied unchanged from [Yielded Auth](https://github.com/yielded-dev/auth/blob/254f476af3efd498a5175de9a008bed1d847964b/packages/drizzle-effect-v4-patch/patches/drizzle-orm%401.0.0-rc.4.patch). It updates removed Effect APIs and SQL type imports in Drizzle RC4. The upstream patch is [MIT-licensed](https://github.com/yielded-dev/auth/blob/254f476af3efd498a5175de9a008bed1d847964b/LICENSE).

Consumers using the Drizzle adapters must apply this patch to the exact `drizzle-orm` version `1.0.0-rc.4`. For pnpm, copy the patch into the application and register it in `pnpm-workspace.yaml`:

```yaml
patchedDependencies:
  drizzle-orm@1.0.0-rc.4: patches/drizzle-orm@1.0.0-rc.4.patch
```
