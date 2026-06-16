# Ansible Migration Plan

Replace the current bash-based install/deploy/uninstall scripts with
Ansible playbooks for improved idempotency, path resolution, and rollback.

## Motivation

| Concern | Current (bash) | Target (Ansible) |
|---------|---------------|------------------|
| **Idempotency** | Manual `grep -q` guards | Native `state=` parameter on every module |
| **Path resolution** | `expand_remote_path` hacks | `ansible_user_dir`, `{{ ansible_env.HOME }}` |
| **Config file editing** | awk section removal, fragile sed | `community.general.ini_file` module |
| **Remote vs local** | `run_on_target` wrapper | Ansible inventory handles both natively |
| **Error handling** | `set -euo pipefail` + `|| true` | Built-in failure handling with `ignore_errors` |
| **Testing** | bats (unit only) | `ansible-playbook --check` + molecule |
| **Rollback** | Separate `uninstall.sh` | Playbook tags + `state=absent` |

## Directory structure

```
ansible/
├── ansible.cfg                  # defaults: host_key_checking=False, etc.
├── inventory/
│   ├── local.yml                # [cnc] ansible_connection=local
│   └── remote.yml               # [cnc] ansible_host=… ansible_user=…
├── playbooks/
│   ├── install.yml              # full install — agent, frontend, plugins
│   ├── deploy.yml               # only build + deploy frontend
│   ├── uninstall.yml            # reverse of install
│   └── update-agent.yml         # re-vendor agent components only
├── roles/
│   ├── agent/
│   │   └── tasks/
│   │       └── main.yml         # vendor cnc_agent + cnc_metadata
│   ├── frontend/
│   │   └── tasks/
│   │       └── main.yml         # bun install, build, deploy to web root
│   ├── klipper-extras/
│   │   └── tasks/
│   │       └── main.yml         # deploy work_coordinate_systems.py
│   ├── macros/
│   │   └── tasks/
│   │       └── main.yml         # deploy wcs_macros.cfg
│   ├── moonraker-config/
│   │   └── tasks/
│   │       └── main.yml         # manage [cnc_agent], [cnc_metadata], [update_manager] sections
│   └── extractor/
│       └── tasks/
│           └── main.yml         # deploy cnc_metadata_extractor.py
├── vars/
│   └── main.yml                 # shared variables (repo URL, paths, versions)
└── requirements.yml             # galaxy collections (community.general, etc.)
```

## Playbook breakdown

### `install.yml` (replaces `install_to_moonraker.sh`)

| Step | Ansible module | Role |
|------|---------------|------|
| Clone/pull repo | `git` | *(pre-task, not in a role)* |
| Vendor cnc_agent | `copy` with `mode=0644` | `agent` |
| Vendor cnc_metadata | `copy` with `mode=0644` | `agent` |
| Deploy extractor | `copy` with `mode=0755` | `extractor` |
| Add `[cnc_agent]` to config | `community.general.ini_file` | `moonraker-config` |
| Add `[cnc_metadata]` to config | `community.general.ini_file` | `moonraker-config` |
| Deploy WCS plugin | `copy` | `klipper-extras` |
| Deploy WCS macros | `copy` | `macros` |
| Add `[update_manager]` entry | `community.general.ini_file` | `moonraker-config` |
| Build and deploy frontend | `command` / `copy` | `frontend` |
| Restart services | `systemd` | *(post-tasks)* |
| Verify agent | `uri` module | *(post-tasks)* |

### `deploy.yml` (replaces `deploy.sh`)

| Step | Module |
|------|--------|
| Install bun deps | `command: bun install --frozen-lockfile` |
| Build | `command: bun run build` |
| Deploy to web root | `copy` with `directory_mode` |
| Write version.json | `copy` with inline content |
| Reload nginx | `systemd: name=nginx state=reloaded` |

### `uninstall.yml` (replaces `uninstall.sh`)

| Step | Module |
|------|--------|
| Remove vendored components | `file: state=absent` |
| Remove extractor script | `file: state=absent` |
| Remove `[cnc_agent]` section | `community.general.ini_file: state=absent` |
| Remove `[cnc_metadata]` section | `community.general.ini_file: state=absent` |
| Remove `[update_manager]` entry | `community.general.ini_file: state=absent` |
| Remove WCS plugin | `file: state=absent` |
| Remove WCS macros | `file: state=absent` |
| Restart moonraker | `systemd: name=moonraker state=restarted` |

## Variable schema (`vars/main.yml`)

```yaml
---
repo:
  url: https://github.com/isaaceliape/mainsail-cnc.git
  dest: "{{ ansible_env.HOME }}/mainsail-cnc"
  branch: develop

frontend:
  web_root: "{{ ansible_env.HOME }}/mainsail"
  deploy_script: "{{ repo.dest }}/deploy.sh"

agent:
  vender_dir: "{{ ansible_env.HOME }}/moonraker/moonraker/components"
  source_dir: "{{ repo.dest }}/moonraker-cnc-agent/src/moonraker_cnc_agent"

klipper:
  extras_dir: "{{ ansible_env.HOME }}/klipper/klippy/extras"

printer_data:
  config_dir: "{{ ansible_env.HOME }}/printer_data/config"
  scripts_dir: "{{ ansible_env.HOME }}/printer_data/scripts"
  macros_dir: "{{ ansible_env.HOME }}/printer_data/config/macros"

moonraker_conf: "{{ printer_data.config_dir }}/moonraker.conf"
```

## Inventory examples

### Local (`inventory/local.yml`)

```yaml
all:
  hosts:
    cnc:
      ansible_connection: local
```

### Remote (`inventory/remote.yml`)

```yaml
all:
  hosts:
    cnc:
      ansible_host: 192.168.1.100
      ansible_user: pi
      ansible_port: 22
```

## Migration steps

| Phase | What | Who |
|-------|------|-----|
| **1** | Create `ansible/` directory skeleton with `ansible.cfg`, `inventory/`, `vars/` | — |
| **2** | Write `agent` role — copy `cnc_agent.py` + `cnc_metadata.py` + `__init__.py` | `agent/tasks/main.yml` |
| **3** | Write `extractor` role — deploy `cnc_metadata_extractor.py` with `mode=0755` | `extractor/tasks/main.yml` |
| **4** | Write `moonraker-config` role — manage the three INI sections with `community.general.ini_file` | `moonraker-config/tasks/main.yml` |
| **5** | Write `klipper-extras` role — deploy `work_coordinate_systems.py` | `klipper-extras/tasks/main.yml` |
| **6** | Write `macros` role — deploy `wcs_macros.cfg` | `macros/tasks/main.yml` |
| **7** | Write `frontend` role — bun install + build + deploy + version.json + nginx reload | `frontend/tasks/main.yml` |
| **8** | Write `install.yml` playbook combining all roles | `playbooks/install.yml` |
| **9** | Write `deploy.yml` playbook (frontend only) | `playbooks/deploy.yml` |
| **10** | Write `uninstall.yml` playbook with `state=absent` on all roles | `playbooks/uninstall.yml` |
| **11** | Add `--check` support and test all playbooks | *(verify idempotency)* |
| **12** | Update INSTALLATION.md to document `ansible-playbook` commands | `docs/INSTALLATION.md` |
| **13** | Add `test:shell` helper to generate an Ansible check run | *(optional)* |
| **14** | Deprecate `scripts/install_to_moonraker.sh` and `scripts/uninstall.sh` | *(keep for legacy, point to playbooks)* |

## Risk analysis

| Risk | Mitigation |
|------|-----------|
| **Ansible not installed on target** | `pip install ansible` is required. The target already has Python for Moonraker. |
| **`community.general` not available** | Add to `requirements.yml` — `ansible-galaxy collection install community.general` |
| **INI file module edge cases** | `ini_file` does not preserve comments or inline whitespace. For formatted entries (like `post_update` lines), use `lineinfile` with `regexp` instead. |
| **Bun not found during frontend build** | Same as current — fail with a clear error. Could add a `bun` detection task. |
| **Backward compat for existing users** | Keep bash scripts unchanged for this release cycle. New users are directed to Ansible. |

## Key decisions

1. **`ini_file` vs `lineinfile` for `moonraker.conf`**
   - Use `community.general.ini_file` for simple sections like `[cnc_agent]` and `[cnc_metadata]`
   - Use `lineinfile` with `insertafter` for `[update_manager mainsail-cnc]` since it has multi-line values (the `post_update` hint spans a long line)

2. **Frontend deploy: `copy` vs `synchronize`**
   - Use `copy` module with `remote_src=true` for the initial implementation — simpler, no rsync dependency
   - Can switch to `synchronize` (rsync) later for speed on repeated deploys

3. **Service restart tagging**
   - Tag all restart tasks with `restart-services`. Users can run `ansible-playbook install.yml --tags restart-services` to restart without re-deploying.

4. **Check mode**
   - All `file/state=absent` and `copy` tasks support `--check` natively
   - `command` tasks (bun build, bun install) are skipped in check mode via `check_mode: no` with a `when: not ansible_check_mode` wrapper
