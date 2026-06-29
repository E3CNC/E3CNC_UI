# Changelog

## v0.8.4 (2026-06-29)
- **Fixed**: `sync_runtime_files()` now creates the scripts directory before copying `cnc_metadata_extractor.py`. On multi-instance fresh setups, the `scripts/` dir didn't exist yet, causing `FileNotFoundError`.

## v0.8.3 (2026-06-29)
- Version bump from v0.8.2 → v0.8.3
- No functional changes — marks the current release state after documentation updates
- Full v0.8.2 changelog below

## v0.8.2 (2026-06-29)
- **CLI commands added**: `detect-mcu` (scan USB/serial for controllers), `flash-mcu` (6 MCU presets, builds firmware), `init-config` (generates CNC printer.cfg template with auto-detected MCU path)
- **Update safety**: `--dry-run` flag previews changes without modifying anything. Pre-update backup now includes raw Moonraker SQLite DB (`moonraker-sql.db`) in addition to printer.cfg, moonraker.conf, and API export.
- **Viewer route verified**: Babylon.js gcode viewer loads correctly, zero runtime errors, 1.8 MB chunk code-split from main bundle.
- **Build code-split**: Vuetify (569 KB) and Vue core (206 KB) split into separate chunks. Index chunk reduced from 1.9 MB → 1.2 MB. Zero build warnings.
- **CI workflow**: Tests (pytest, 115 tests) + frontend build (bun) run on every push/PR. Cached pip and bun dependencies.
- **Integration tests fixed**: `.dockerignore` reduced build context from 5.4 MB → 288 KB. Pre-installed ansible + python3-pip/venv in Docker image. Added `vendor/klipper/scripts/klippy-requirements.txt` (Klipper deps were silently skipped). Switched to Linux MCU process (bidirectional serial) instead of host simulator (one-way only).
- **Real hardware test**: Full update v0.8.0→v0.8.2 on BTT-CB1 (Debian 11, Python 3.9, STM32G0B1 MCU). Auto-rollback verified, Klippy reconnection confirmed, all 6 health checks pass.
- **Python 3.9 compatibility**: Replaced `str | None` syntax with `'str | None'` string annotations for Debian 11 compatibility.
- **Health check retries**: Increased from 3→6 (30s max) for slower ARM boards.
- **DB backup fix**: Glob pattern broadened to match `*.db`, `*.sqlite`, `*.sqlite3` (real Moonraker uses `moonraker-sql.db`).

## v0.8.1 (2026-06-28)
- Fix `UnicodeEncodeError` in `print_banner()` on latin-1 terminals

## v0.8.0 (2026-06-28)
- **Single-deploy migration** — repo renamed `E3CNC_UI`→`E3CNC`, flattened layout, vendored Moonraker/Klipper upstream snapshots
- **Stack artifact** — CI builds `e3cnc-stack-v*.tar.zst` containing frontend, Moonraker components, Klipper extras, macros, scripts, and manifest
- **CLI rewrite** — `e3cnc-cli` now a unified stack-apply tool with `update`, `releases`, `rollback`, `prune`, and legacy commands
- **Staged runtime activation** — releases stored in `~/e3cnc/releases/` with `current` symlink, journal, auto-rollback on health check failure
- **7 health checks** — Moonraker API, CNC agent, metadata component, Klipper state, nginx config, web root, and metadata loaded verification
- **Fresh-install bootstrap MVP** — new Ansible role bootstraps a clean machine from zero: base packages, vendored Moonraker/Klipper, venvs, systemd units, nginx, placeholder printer.cfg
- **Web root rename** — `~/mainsail` → `~/e3cnc-web` for fresh bootstrap installs
- **Nightly CI releases** — pre-built frontend published as GitHub release on every push to `main`, with `post_update_script` automation

## v0.7.11 (2026-06-25)
- Comment out an existing `[update_manager mainsail]` block in `moonraker.conf` during install to avoid conflicts with `E3CNC`

## v0.7.10 (2026-06-25)
- Multi-instance detection now supports KIAUH-style layouts like `~/printer_test1_data`
- Use shared `~/moonraker`, `~/klipper`, and shared `~/mainsail` by default instead of inventing per-instance dirs
- Derive per-instance `moonraker_service`, `klipper_service`, and `moonraker_port` from instance metadata/config
- Make install/redeploy/uninstall health checks and restarts use the selected instance service and port
- Make status, diagnose, logs, backup, and restore instance-aware
- Prompt for local `sudo` credentials before non-interactive privileged steps
- Docker multi-instance test now models real shared-dir + per-service KIAUH setups

## v0.7.9 (2026-06-25)
- Multi-instance support — separate `moonraker_dir`/`klipper_dir` per instance in Ansible vars
- No more `community.general` dependency — replaced `ini_file` with `lineinfile`
- No more `bun`/`node` required on target — frontend is pre-built
- Auto-install missing deps (pip, ansible, curl, unzip) with PEP 668 fix
- Frontend download uses direct GitHub URL — no `node` needed for release lookup
- Add Docker test containers for fresh-install and multi-instance testing

## v0.7.8 (2026-06-25)
- Cleanup Vuetify 2 class leftovers across 20+ files
- Replace Vue 2 `vue-load-image` package with local Vue 3 component
- Fix TimelapseFilesPanel `sortBy` prop for Vuetify 3 data-table
- **Auto-install missing dependencies** — pip, ansible, curl, unzip installed automatically
- **No more community.general dependency** — replaced `ini_file` module with `lineinfile`
- **No more `bun`/`node` required** on target machine — frontend is pre-built
- **Multi-instance support** — separate `moonraker_dir`/`klipper_dir` per instance in Ansible vars
- **Ansible stdout_callback fixed** — uses `result_format=yaml` (compatible with community.general v12+)
- **PEP 668 handled** — `--break-system-packages` for Ubuntu 24.04+
- Add Docker test containers: `Dockerfile.fresh-install`, `Dockerfile.multi-instance`

## v0.7.7 (2026-06-25)
- Version compatibility check between `e3cnc-cli` and `_e3cnc_shared.py`
- Various bug fixes: auto-connect, auto-detect, font restore, Ansible fixes

## v0.7.6 (2026-06-25)
- Fix `run_ansible_playbook` — added missing `extra_vars` parameter

## v0.7.5 (2026-06-25)
- Interactive menu: loop, switch instance, confirmation prompts
- SSH validation, Ansible prerequisite check, `--instance` flag
- Multi-instance docs

## v0.7.3 (2026-06-24)
- **Moonraker MCP server** — 13 MCP tools for AI agent integration
- Package rename: `moonraker-cnc-agent` → `moonraker-mcp`
- Ansible fixes: printer.cfg includes, recursive var, download_frontend.sh
- Post-update script improvements, dry-run mode for backup restore

## v0.7.2 (2026-06-22)
- **Ndot57 theme** — new display font with configurable letter-spacing
- Font inheritance system via CSS custom properties
- Rem units across 25+ components
- DRO formatting improvements

## v0.7.1 (2026-06-22)
- Rename project from `mainsail-cnc` to `E3CNC UI`

## v0.7.0 (2026-06-22)
- Initial release under E3CNC organization
