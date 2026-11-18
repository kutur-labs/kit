# @kutur-kit/assets

## 0.1.0-alpha.4

### Minor Changes

- e0a1733: Requires alchemy and `@alchemy.run/cloudflare` 2.0.0-beta.87 and `@distilled.cloud/aws` 1.0.0-rc.20. That alchemy release requires Effect 4.1.4 or later, so `@kutur-kit/assets/alchemy/r2` does too.

## 0.1.0-alpha.3

### Patch Changes

- e6b2d2b: Imports Effect modules by subpath, so unbundled runs and esbuild bundles load only the modules the package uses.

## 0.1.0-alpha.2

### Patch Changes

- cc08b1e: The filesystem bucket names body files with the app's `SecureRandom` service when it provides one, else Web Crypto.

## 0.1.0-alpha.1

### Minor Changes

- 829c058: Requires Effect 4.1, alchemy 2.0.0-beta.85 and `@alchemy.run/cloudflare`, where alchemy's Cloudflare resources moved. `@kutur-kit/assets/alchemy/r2` takes buckets declared with `@alchemy.run/cloudflare`.

## 0.1.0-alpha.0

### Minor Changes

- 6df47e3: First alpha release.
