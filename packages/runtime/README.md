# @cartodex/runtime

Deterministic scanner runtime used by Cartodex's repository-local skill.

Most users do not install this package directly. The `cartodex` package installs
a thin repository-local launcher and a private tools manifest that pins an exact
runtime version without adding scanner dependencies to the host project.

The package exposes the scanner API from its root ESM export:

```js
import { runCli, scanDirectory } from "@cartodex/runtime";
```

The public API also includes argument parsing, tree formatting, ignore helpers,
token helpers, and their TypeScript types. The package intentionally does not
provide a binary: the installed Cartodex launcher owns process setup, private
dependency installation, and CLI delegation.

`@cartodex/runtime` requires Node.js 20 or newer.

The runtime and installer use independent semantic versions. The installer pins
the exact runtime version it consumes. When an installer release adopts a new
runtime, publish the runtime first, generate the installer's nested tools
lockfile from that registry release, and then publish `cartodex`.
