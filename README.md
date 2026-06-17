# mainsail-cnc

[![Build Frontend](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/build-frontend.yml/badge.svg?branch=develop)](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/build-frontend.yml)
[![CI](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/isaaceliape/mainsail-cnc/actions/workflows/ci.yml)

CNC-focused control stack for Klipper + Moonraker, forked from [Mainsail](https://github.com/mainsail-prusa/mainsail). DRO, jog, WCS offsets, spindle & coolant, MDI, and CAM metadata — all native, no plugins required.

```bash
git clone https://github.com/isaaceliape/mainsail-cnc.git ~/mainsail-cnc && cd ~/mainsail-cnc
ansible-playbook ansible/playbooks/install.yml   # or: ./deploy.sh --live
```

**Features:**

- **DRO** — live machine/work position, velocity, homed flags, axis limits
- **Jog** — directional pad, step-size selector, configurable feedrates, keyboard nav
- **Offsets** — G54–G59 WCS manager with interactive SVG OffsetPreview
- **Spindle & Coolant** — ON/OFF/CCW, RPM, flood/mist toggles
- **MDI** — console-style command entry with WCS shortcuts
- **CAM Metadata** — tool, work envelope, feeds, spindle RPM in file cards
- **WCS Klipper plugin** — full G10 L2/L20 support with JSON persistence
- **Moonraker CNC agent** — guarded endpoints for all CNC actions
- **Ansible deploy** — idempotent install/deploy/uninstall

Full docs on the [wiki](https://github.com/isaaceliape/mainsail-cnc/wiki) — [Installation](https://github.com/isaaceliape/mainsail-cnc/wiki/Installation) · [Architecture](https://github.com/isaaceliape/mainsail-cnc/wiki/Architecture) · [API](https://github.com/isaaceliape/mainsail-cnc/wiki/API) · [Contributing](https://github.com/isaaceliape/mainsail-cnc/wiki/Contributing) · [Changelog](https://github.com/isaaceliape/mainsail-cnc/wiki/Changelog)

**Contributors:** Shadowphyre — documentation, WCS integration review, project guidance
