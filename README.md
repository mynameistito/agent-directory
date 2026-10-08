# mynameistito Agent Directory

[![CI](https://github.com/mynameistito/agent-directory/actions/workflows/ci.yml/badge.svg)](https://github.com/mynameistito/agent-directory/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A small, publisher-maintained catalog of mynameistito products and their documented interfaces. The directory is available as JSON and through a read-only [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server using Streamable HTTP.

The catalog describes products; it does not execute or proxy them. Entries are not independent security, identity, or availability attestations.

## Endpoints

- Directory: <https://agents.mynameistito.com/>
- Catalog JSON: <https://agents.mynameistito.com/catalog.json>
- Well-known index document: <https://agents.mynameistito.com/.well-known/agent-index.json>
- MCP Streamable HTTP: <https://agents.mynameistito.com/mcp>
- Health: <https://agents.mynameistito.com/health>

## MCP capabilities

Connect an MCP client to `https://agents.mynameistito.com/mcp` using the Streamable HTTP transport. The server is stateless and read-only.

### Tools

| Tool | Input | Behavior |
| --- | --- | --- |
| `list_products` | Optional `protocol`: `mcp`, `rest`, or `cli` | List catalog entries, optionally filtered by one of their actual interfaces. |
| `get_product` | Required stable product `id` | Return one product with its published interfaces and limitations; returns `null` if no ID matches. |
| `search_products` | Required `query`; optional `protocol` | Search IDs, names, descriptions, and limitations, optionally filtering by interface. |

Tool results include both readable JSON text and structured content. They describe entries only and never make calls to a listed product.

### Resources

- `directory://manifest` — complete versioned catalog JSON.
- `directory://products/{id}` — a single product entry, or a not-found result.

### Prompt

- `choose_product_for_task(task)` — asks a client to compare a task with current catalog entries, state interface fit and limitations, and avoid inventing unsupported capabilities.

## Current entries

- **mynameistito Agent Directory** — this MCP catalog and its JSON manifest.
- **Hamilton Bin Day** — REST lookup API, `@mynameistito/hcc-bin-day` CLI, and a read-only MCP lookup endpoint at `https://bin-day.mynameistito.com/api/mcp`. It is not described as an A2A service.

Update `src/domain/catalog.ts` when adding products. Add only interfaces that exist and are publicly documented. Keep descriptions and limitations factual; a DNSSEC-signed DNS record or a publisher-controlled catalog is not a security audit or guarantee of an endpoint's behavior.

## DNS-AID

DNS-AID is currently an Internet-Draft and its index document format is not standardized. The public DNS zone `mynameistito.com` is DNSSEC-signed. This organization-index entry points to the production directory:

```dns
_index._agents.mynameistito.com. 3600 IN SVCB 1 agents.mynameistito.com. alpn="h2,http/1.1" port=443
```

This points discovery to the HTTPS organization directory; the MCP endpoint itself is `https://agents.mynameistito.com/mcp`. It advertises only HTTP transports (`h2` and `http/1.1`), not a draft-only `mcp` ALPN identifier or an invented experimental SvcParamKey. Check the current [DNS-AID draft](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/) and [RFC 9460](https://www.rfc-editor.org/rfc/rfc9460) before changing experimental SVCB parameters.

The directory is also published at the service hostname `agents.mynameistito.com`. DNS-AID scanners that treat that hostname as the organization domain query its own well-known owner name, so this second pointer is published as well:

```dns
_index._agents.agents.mynameistito.com. 3600 IN SVCB 1 agents.mynameistito.com. alpn="h2,http/1.1" port=443
```

The Hamilton Bin Day service is published at `bin-day.mynameistito.com`. Since discovery checks may use that service hostname as the organization domain, it also points to the central directory:

```dns
_index._agents.bin-day.mynameistito.com. 3600 IN SVCB 1 agents.mynameistito.com. alpn="h2,http/1.1" port=443
```

All three records are ServiceMode SVCB pointers to the central directory and are covered by the DNSSEC-signed `mynameistito.com` zone. `alchemy.run.ts` declares the pointers and DNSSEC for the production stage. Existing records and the zone are explicitly adopted so Alchemy can manage them without replacing them.

## Development

Requires Bun 1.4.2. GitHub CI runs on `ubuntu-24.04`. The project has no Node.js runtime dependency: Bun is used for development, tests, builds, and deployment. GitHub JavaScript Actions run on Node.js 24; Cloudflare's `nodejs_compat` is a Worker API compatibility flag, not a Node version pin.

```sh
bun install
bun run dev
bun run check
bun run typecheck
bun run test
bun run build
```

Alchemy owns Cloudflare Worker deployment and state:

```sh
$env:STAGE = "prod"
bun run deploy
```

Preview stages omit the production custom domain. The production stage binds `agents.mynameistito.com`.

## GitHub deployment

`.github/workflows/deploy.yml` uses [`mynameistito/alchemy-deploy`](https://github.com/mynameistito/alchemy-deploy), pinned to the immutable v3.1.3 commit. The `CI` workflow builds and uploads a credential-free Worker artifact; production deploy and PR previews are performed by the trusted reusable action.

Configure this repository variable and secret before deployment:

- `CLOUDFLARE_ACCOUNT_ID` (Actions variable)
- `CLOUDFLARE_API_TOKEN` — narrowly scoped to the Cloudflare account and required Worker deployment operations.

For the API token, grant **Account → Workers Scripts → Edit** on the target account, plus **Zone → Workers Routes → Edit**, **Zone → DNS → Edit**, and **Zone → Zone → Read** for `mynameistito.com`. DNS Edit is needed for Alchemy to adopt and reconcile the SVCB records and DNSSEC state. Cloudflare provisions the Custom Domain's DNS and certificate. Use a Cloudflare API token, not the global API key.

PR builds receive no Cloudflare credentials. Fork PRs do not receive privileged previews. Scheduled reconciliation cleans up previews whose PR-close event was missed.

## License

MIT. See [LICENSE](./LICENSE).
