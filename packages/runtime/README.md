# @cartodex/runtime

Deterministic scanner runtime used by Cartodex's repository-local skill.

The package exposes the scanner API from its root ESM export. It intentionally
does not provide a binary: the installed Cartodex launcher owns process setup,
private dependency installation, and CLI delegation.

```js
import { runCli, scanDirectory } from "@cartodex/runtime";
```

`@cartodex/runtime` requires Node.js 20 or newer.
