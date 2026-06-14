# Moonraker CNC Agent

A Moonraker component for CNC-specific state and workflows.

## Scope

Klipper already exposes the read-only machine state used by the Mainsail CNC
panels (`toolhead`, `gcode_move`, `print_stats`, `configfile`), and the
frontend reads it directly from Mainsail's existing Vuex store subscription.
The agent does **not** re-expose that data.

This component owns the things Klipper does not model and the workflows that
need a central, guarded surface:

- spindle state and control (`state`, `rpm`, `override`)
- coolant state and control (`flood`, `mist`)
- units tracking (`G20`/`G21`)
- active work coordinate system (`G54`..`G59`, `G53`) and per-WCS offsets
- safe jog / set-zero / WCS-select command endpoints
- CNC dashboard settings persistence (separate from Mainsail's settings)
- machine profile loading for capability/safety/frontend feature gating

## Current state

The component is implemented and registers CNC endpoints under
`/server/cnc/...`:

- `GET /server/cnc/state`
- `GET/POST /server/cnc/spindle`
- `GET/POST /server/cnc/coolant`
- `GET/POST /server/cnc/units`
- `GET /server/cnc/wcs`
- `POST /server/cnc/wcs/select`
- `POST /server/cnc/wcs/set-zero`
- `POST /server/cnc/jog`
- `GET/POST /server/cnc/settings`

It owns spindle, coolant, units, WCS, guarded jog/set-zero actions, CNC
settings persistence, and optional machine profile loading for frontend
feature gating. Read-only Klipper machine state still comes directly
from Mainsail's existing websocket store subscription.

## MCP server

This package also includes a Moonraker MCP server for the same printer host.
It exposes tools for Moonraker server info, printer info, printer objects,
G-code, history, webcams, and host system data.

### Run locally

```bash
cd moonraker-cnc-agent
PYTHONPATH=src python -m moonraker_cnc_agent.mcp_server
```

### Install as a console script

```bash
pip install -e .
moonraker-cnc-mcp
```

### Environment

- `MOONRAKER_URL` — Moonraker base URL, default: `http://127.0.0.1:7125`
- `MOONRAKER_API_KEY` — optional `X-Api-Key` header value
- `MOONRAKER_TIMEOUT` — request timeout in seconds, default: `15`

### Exposed MCP tools

- `moonraker_server_info`
- `moonraker_server_config`
- `moonraker_printer_info`
- `moonraker_printer_objects_list`
- `moonraker_query_printer_objects`
- `moonraker_gcode_help`
- `moonraker_send_gcode`
- `moonraker_job_queue_status`
- `moonraker_history_list`
- `moonraker_webcams_list`
- `moonraker_system_info`
- `moonraker_proc_stats`
- `moonraker_request`

## Installation

Use the deploy script from the repo root:

```sh
./scripts/install_to_moonraker.sh
```

It vendors the package into moonraker's `components/` directory, installs
runtime dependencies into `moonraker-env`, ensures the `[cnc_agent]` section
is present in the active `moonraker.conf`, and restarts Moonraker.

## Updates via the Mainsail update manager

The install script also wires the project into Moonraker's update manager
by default, so mainsail-cnc shows up in Mainsail's **Machine → Update
Manager** panel alongside Klipper, Moonraker, and stock Mainsail.

The entry is `type: git_repo` pointing at the monorepo clone on the
printer (`~/mainsail-cnc` by default). The install script creates that
clone on first run (and `git pull --ff-only`s on subsequent runs) so
it's a real git checkout of the project — no synthetic subpath, no
"ahead 1, behind N" weirdness.

Clicking **Update** in the Mainsail UI runs `git pull` and restarts
Moonraker. The agent is vendored into
`moonraker/moonraker/components/cnc_agent/` by the install script, so a
pull alone won't activate the new code — re-run
`./scripts/install_to_moonraker.sh` to re-vendor and restart Moonraker.

To skip the update-manager work on install:

```sh
CNC_SKIP_UPDATE_MANAGER=1 ./scripts/install_to_moonraker.sh
# or skip just the clone/pull step (use an existing checkout):
CNC_SKIP_CLONE=1 ./scripts/install_to_moonraker.sh
```

Path and channel overrides are also available as `CNC_REPO_DIR`,
`CNC_REPO_URL`, and `CNC_CHANNEL`. See the script header for the full
list.

A standalone snippet that you can `[include]` from `moonraker.conf`
manually lives at [`config/examples/update-manager.conf`](../config/examples/update-manager.conf).
