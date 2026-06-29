# E3CNC Project Status

## What we've done

### v0.8.2 — Stabilization, CLI Workflow, Real Hardware Test

#### CLI Commands
- **`e3cnc-cli detect-mcu`** — scans `/dev/serial/by-id/*`, `/dev/ttyUSB*`, `/dev/ttyACM*` for serial devices, parses vendor/model/serial, marks Klipper-flashed MCUs with ◉
- **`e3cnc-cli flash-mcu`** — menu of 6 MCU presets (STM32F103 USB/serial, STM32F407, STM32F446, RP2040, Linux), writes `.config`, runs `make olddefconfig && make -j4`, shows flash instructions
- **`e3cnc-cli init-config`** — generates 159-line CNC printer.cfg with auto-detected MCU path, stepper X/Y/Z templates with `!!! ADJUST` markers, spindle/coolant sections, E3CNC macro includes

#### Safety & Update System
- **`e3cnc-cli update --dry-run`** — discovers release, downloads, backs up configs, shows what would change without modifying anything
- **Pre-update backup** — snapshots `printer.cfg`, `moonraker.conf`, raw Moonraker SQLite DB, WCS offsets, journal.json
- **Auto-rollback** — if health checks fail after update, automatically rolls back to previous release
- **Config safety** — `printer.cfg` and `moonraker.conf` are never overwritten by update
- **Health checks** — 6 checks: Moonraker API, Klippy connection, cnc_agent, frontend, journal consistency, Klipper service

#### Build System
- Code-split into proper chunks: `index` (1.2 MB), `vuetify` (569 KB), `vue-core` (206 KB), `Viewer` (1.8 MB — Babylon.js)
- Build warning limit raised to 2000 KB for expected-large chunks
- Zero warnings, 56s (npm) / 66s (bun) build time
- npm and bun both supported; bun install is 10× faster (1.6s)

#### Integration Test Fixes
- `.dockerignore` — build context reduced from 5.4 MB → 288 kB, build time from 175s → 15s
- Pre-installed ansible + python3-pip + python3-venv in Docker image
- `vendor/klipper/scripts/klippy-requirements.txt` added (was missing, pip install silently skipped)
- Use Linux MCU (`CONFIG_MACH_LINUX`) instead of host simulator (`CONFIG_MACH_SIMU`) which can't receive data
- All tests: 115 unit + 2 integration passing

#### Real Hardware Test (BTT-CB1, Debian 11, STM32G0B1)
- Full update from v0.8.0 → v0.8.2 via `e3cnc-cli update` — successful
- Auto-rollback tested and verified (v0.8.2 → v0.8.0 on health check failure)
- Klippy reconnection verified after service restart
- Moonraker + CncAgent active
- Python 3.9 compatibility fixed (string annotations for `str | None`)

#### CI
- GitHub Actions workflow on push/PR: Python tests (pytest) + frontend build (bun)
- Pre-existing `build-frontend.yml` for release artifact creation (manual trigger)
- Cached pip and bun dependencies

---

## Current State

### Git Status
- Branch: `main`
- Ahead of `origin/main` by **0 commits** (up to date)
- Version: `0.8.2`

### Test Suite
| Suite | Count | Status |
|---|---|---|
| Python unit tests (pytest) | 115 | ✅ All passing |
| Docker integration (file verification) | 17 checks | ✅ Passes |
| Docker integration (simulated MCU) | Full stack | ✅ Passes |
| CI (GitHub Actions) | Python + build | ✅ Configured |
| Real hardware (BTT-CB1, STM32G0B1) | Update + verify | ✅ Passed |
| Frontend build | Zero warnings | ✅ 56s |

### Known Issues
1. **MCP pip package requires Python 3.10+** — shows warning on Debian 11 (Python 3.9). Non-blocking, the bundled MCP server works without pip install.
2. **Systemd drop-in permissions** — non-root users see permission warnings on update. Non-blocking, services work without overrides.
3. **No ARM wheels for cffi** — compiles from source on Pi, takes 2+ minutes. Minor.
4. **TypeScript errors (~1,400)** — ~1,200 `implicit any` in Vuex, ~200 genuine errors. Deferred.

---

## What's Next

### 1. 🟡 Probing & CNC Setup Workflows (EPIC #9)
- Shared probe safety layer (#3)
- Touch-plate / probe wizard for work zeroing (#4)
- Edge/corner/center/bore probing workflows (#5)
- Tool-setter workflow for tool length measurement (#6)
- WCS slot target for probe results (#7)
- Dry-run preview for probe cycles (#8)

### 2. 🟡 v1.0 Stabilization (EPIC #16)
- Vuetify 3 visual QA sweep (#11)
- Critical-path smoke coverage (#12)
- Reconnect/degraded-state hardening (#13)
- Release checklist / RC gate (#15)

### 3. 🟢 Cleanup & Tech Debt
- Fix MCP pip version check for Python <3.10
- Fix `vv0.8.x` double-v prefix in dry-run output
- Skip systemd drop-in when non-root
- Update wiki Installation page
- TypeScript error reduction
