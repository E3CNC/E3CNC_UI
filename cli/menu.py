"""Interactive menu for the E3CNC CLI."""

import sys

from _e3cnc_shared import (
    VERSION, TOOL_NAME, Style,
    print_banner, ok, info, warn, fail,
    get_active_instance, detect_instances, set_active_instance,
    INSTANCES_DIR, Instance,
)
from _e3cnc_deploy import get_current_release, generate_admin_page
from cli.keyreader import read_key, restore_terminal, enable_echo


def _interactive_menu() -> None:
    """Display the interactive menu and dispatch user choices."""
    from cli.commands import (
        cmd_check, cmd_install, cmd_deploy, cmd_update, cmd_uninstall,
        cmd_status, cmd_backup, cmd_restore, cmd_diagnose, cmd_logs,
        cmd_releases, cmd_rollback, cmd_prune, cmd_instances, cmd_migrate,
        cmd_detect_mcu, cmd_flash_mcu, cmd_init_config,
    )

    all_items = [
        ("[S] Status",      "status"),
        ("[I] Install",     "install"),
        ("[D] Deploy",      "deploy"),
        ("[U] Update",      "update"),
        ("[X] Uninstall",   "uninstall"),
        ("",                ""),
        ("[Dm] Detect MCU", "detect-mcu"),
        ("[Fm] Flash MCU",  "flash-mcu"),
        ("[Ic] Init Config","init-config"),
        ("",                ""),
        ("[Ci] Create Instance", "create-instance"),
        ("[Rl] Releases",   "releases"),
        ("[Rb] Rollback",   "rollback"),
        ("[P] Prune",       "prune"),
        ("",                ""),
        ("[N] Instances",   "instances"),
        ("[C] Check Deps",  "check"),
        ("[B] Backup",      "backup"),
        ("[Rr] Restore",    "restore"),
        ("[G] Diagnose",    "diagnose"),
        ("[L] Logs",        "logs"),
        ("",                ""),
        ("[W] Switch Instance", "switch"),
        ("[Q] Quit",        "quit"),
    ]
    display = [(l, c) for l, c in all_items if l]

    # Build shortcut map: lowercased bracket content -> command
    shortcut_map = {}
    for label, cmd in display:
        if "[" in label and "]" in label:
            key = label[label.index("[") + 1:label.index("]")]
            shortcut_map[key.lower()] = cmd

    cur_idx = 0
    num_buf = ""
    has_tty = sys.stdin.isatty()

    while True:
        # ── Render menu ─────────────────────────────────────
        print_banner()
        print(f"  {Style.BOLD}{Style.GREEN}{TOOL_NAME} v{VERSION}{Style.RESET}")

        cur = get_active_instance()
        if cur:
            label = cur.name if cur.name != "cnc" else "default"
            print(f"  {Style.DIM}Instance: {label}  ({cur.config_dir}){Style.RESET}")

        print()
        print(f"  {Style.BOLD}Select an action:{Style.RESET}")
        print()

        for i, (label, cmd) in enumerate(display):
            if has_tty and i == cur_idx:
                print(f"  {Style.GREEN}\u25b6{Style.RESET} {i + 1:>2}) {label}")
            else:
                print(f"    {i + 1:>2}) {label}")

        print()

        if has_tty:
            hint = "arrows, enter, or type number/shortcut"
            if num_buf:
                hint += f"  [{Style.BOLD}{num_buf}{Style.RESET}]"
            sys.stdout.write(f"  {Style.DIM}{hint}{Style.RESET}")
            sys.stdout.flush()

            # ── Key input loop ────────────────────────────
            key = read_key()

            if key == "CTRLC":
                print()
                break

            if key == "q" or key == "Q":
                ok("Goodbye")
                break

            if key == "UP":
                cur_idx = (cur_idx - 1) % len(display)
                num_buf = ""
                # Cursor-up to overwrite prompt line
                sys.stdout.write("\033[1A\033[2K\r")
                sys.stdout.flush()
                continue

            if key == "DOWN":
                cur_idx = (cur_idx + 1) % len(display)
                num_buf = ""
                sys.stdout.write("\033[1A\033[2K\r")
                sys.stdout.flush()
                continue

            if key == "ENTER":
                restore_terminal()
                # Resolve number buffer if present
                if num_buf:
                    try:
                        idx = int(num_buf) - 1
                        if 0 <= idx < len(display):
                            cur_idx = idx
                        else:
                            num_buf = ""
                    except ValueError:
                        pass
                num_buf = ""
                _, cmd = display[cur_idx]
                if cmd == "quit":
                    ok("Goodbye")
                    break
                if cmd == "switch":
                    _switch_instance()
                elif cmd == "create-instance":
                    _create_instance()
                else:
                    _run_menu_command(cmd)
                continue

            if key == "TAB":
                # Move down one item
                cur_idx = (cur_idx + 1) % len(display)
                num_buf = ""
                sys.stdout.write("\033[1A\033[2K\r")
                sys.stdout.flush()
                continue

            # Number input — accumulate digits
            if key.isdigit():
                num_buf += key
                sys.stdout.write("\033[1A\033[2K\r")
                sys.stdout.flush()
                continue

            # Try shortcut key
            restored = False
            if key.lower() in shortcut_map:
                cmd = shortcut_map[key.lower()]
                if cmd == "quit":
                    ok("Goodbye")
                    break
                restore_terminal()
                restored = True
                if cmd == "switch":
                    _switch_instance()
                elif cmd == "create-instance":
                    _create_instance()
                else:
                    _run_menu_command(cmd)
                num_buf = ""
                continue

            # Clear on unknown key
            num_buf = ""
            sys.stdout.write("\033[1A\033[2K\r")
            sys.stdout.flush()

        else:
            # Non-TTY: use regular input()
            try:
                choice = input(f"  {Style.BOLD}Choice [1-{len(display)}]{Style.RESET} ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break

            if not choice:
                continue

            # Number
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(display):
                    _, cmd = display[idx]
                    if cmd == "quit":
                        ok("Goodbye")
                        break
                    if cmd == "switch":
                        _switch_instance()
                    elif cmd == "create-instance":
                        _create_instance()
                    else:
                        _run_menu_command(cmd)
                    continue
            except ValueError:
                pass

            # Shortcut
            if choice.lower() in shortcut_map:
                cmd = shortcut_map[choice.lower()]
                if cmd == "quit":
                    ok("Goodbye")
                    break
                if cmd == "switch":
                    _switch_instance()
                elif cmd == "create-instance":
                    _create_instance()
                else:
                    _run_menu_command(cmd)
                continue

            print(f"  {Style.YELLOW}Invalid choice: {choice}{Style.RESET}")

    # ── Non-TTY path ───────────────────────────────────────


def _run_menu_command(cmd: str) -> None:
    """Run a command from the menu using a fake args namespace."""
    from cli.commands import (
        cmd_check, cmd_install, cmd_deploy, cmd_update, cmd_uninstall,
        cmd_status, cmd_backup, cmd_restore, cmd_diagnose, cmd_logs,
        cmd_releases, cmd_rollback, cmd_prune, cmd_instances, cmd_migrate,
        cmd_detect_mcu, cmd_flash_mcu, cmd_init_config,
    )

    _DESTRUCTIVE = ("install", "update", "uninstall")
    labels = {"install": "Install", "update": "Update", "uninstall": "Uninstall"}

    if cmd in _DESTRUCTIVE:
        print()
        try:
            answer = input(
                f"  {Style.YELLOW}\u26a0 {labels.get(cmd, cmd)} is destructive. Continue? [y/N] {Style.RESET}"
            ).strip().lower()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if answer != "y":
            print(f"  {Style.DIM}Cancelled{Style.RESET}")
            return

    class _Fake:
        pass

    args = _Fake()
    args.remote = None
    args.check = False
    args.verbose = False
    args.backup_dir = ""
    args.yes = True
    args.lines = 50
    args.instance = None
    args.dry_run = False
    args.name = None
    args.command = cmd

    dispatch = {
        "check": cmd_check,
        "install": cmd_install,
        "deploy": cmd_deploy,
        "update": cmd_update,
        "uninstall": cmd_uninstall,
        "status": cmd_status,
        "backup": cmd_backup,
        "restore": cmd_restore,
        "diagnose": cmd_diagnose,
        "diag": cmd_diagnose,
        "doctor": cmd_diagnose,
        "logs": cmd_logs,
        "releases": cmd_releases,
        "rel": cmd_releases,
        "rollback": cmd_rollback,
        "prune": cmd_prune,
        "migrate": cmd_migrate,
        "migrate-layout": cmd_migrate,
        "instances": cmd_instances,
        "inst": cmd_instances,
        "list": cmd_instances,
        "detect-mcu": cmd_detect_mcu,
        "detect": cmd_detect_mcu,
        "scan": cmd_detect_mcu,
        "flash-mcu": cmd_flash_mcu,
        "flash": cmd_flash_mcu,
        "build": cmd_flash_mcu,
        "init-config": cmd_init_config,
        "init": cmd_init_config,
    }

    handler = dispatch.get(cmd)
    if handler:
        handler(args)
    else:
        fail(f"Unknown command: {cmd}")


def _switch_instance() -> None:
    """Let the user switch the active instance interactively."""
    instances = detect_instances()
    if not instances:
        warn("No instances detected")
        return

    if len(instances) == 1:
        set_active_instance(instances[0])
        info(f"Switched to: {Style.BOLD}{instances[0].name}{Style.RESET}")
        return

    print()
    print(f"  {Style.BOLD}Available instances:{Style.RESET}")
    print()
    for i, inst in enumerate(instances):
        dot = "\x1b[32m\u25cf\x1b[0m" if inst.is_running else "\x1b[90m\u25cb\x1b[0m"
        print(f"  {i + 1:>2}) {dot} {Style.BOLD}{inst.name}{Style.RESET}")
        print(f"      Config: {inst.config_dir}")

    print()
    try:
        choice = input(f"  {Style.BOLD}Choose instance [1-{len(instances)}]{Style.RESET} ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return

    try:
        idx = int(choice) - 1
        if 0 <= idx < len(instances):
            set_active_instance(instances[idx])
            info(f"Switched to: {Style.BOLD}{instances[idx].name}{Style.RESET}")
        else:
            warn("Invalid choice")
    except ValueError:
        warn("Invalid choice")


def _create_instance() -> None:
    """Interactively create a new instance."""
    import re

    print()
    info("Creating a new E3CNC instance")
    print()

    existing = detect_instances()
    if existing:
        print(f"  {Style.BOLD}Existing instances:{Style.RESET}")
        for inst in existing:
            dot = "\x1b[32m\u25cf\x1b[0m" if inst.is_running else "\x1b[90m\u25cb\x1b[0m"
            print(f"    {dot} {inst.name}  ({inst.config_dir})")
        print()

    try:
        raw = input(f"  {Style.BOLD}Instance name: {Style.RESET}").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return

    name = re.sub(r"[^a-z0-9-]", "", raw.lower().replace(" ", "-"))
    if not name:
        warn("Invalid name — use lowercase letters, numbers, and hyphens")
        return

    if (INSTANCES_DIR / name).exists():
        warn(f"Instance '{name}' already exists at {INSTANCES_DIR / name}")
        return

    inst = Instance.from_name(name)
    set_active_instance(inst)

    print()
    info(f"Creating instance: {Style.BOLD}{name}{Style.RESET}")

    data = INSTANCES_DIR / name / "data"
    frontend = INSTANCES_DIR / name / "frontend"
    for subdir in ["config", "config/E3CNC/macros", "logs", "database", "comms", "scripts", "gcodes"]:
        (data / subdir).mkdir(parents=True, exist_ok=True)
    frontend.mkdir(parents=True, exist_ok=True)
    ok(f"Directories created at {INSTANCES_DIR / name}")

    used_ports = {inst.moonraker_port for inst in existing}
    port = 7125
    while port in used_ports:
        port += 1

    conf_path = data / "config" / "moonraker.conf"
    conf_path.write_text(f"""[server]
host: 0.0.0.0
port: {port}
klippy_uds_address: {data / 'comms' / 'klippy.sock'}

[file_manager]
config_path: {data / 'config'}

[database]
database_path: {data / 'database'}

[authorization]
cors_domains:
    *
trusted_clients:
    127.0.0.1
    ::1

[cnc_agent]

[cnc_metadata]
extractor_path: {data / 'scripts' / 'cnc_metadata_extractor.py'}
timeout: 30
""")
    ok(f"moonraker.conf created (port {port})")

    generate_admin_page()

    printer_cfg = data / "config" / "printer.cfg"
    printer_cfg.write_text("# E3CNC bootstrap placeholder printer.cfg\n")
    ok("Placeholder printer.cfg created")

    print()
    info(f"Instance '{name}' created")
    info(f"  Config: {conf_path}")
    info(f"  Service: e3cnc-{name}-moonraker")
    info(f"  Port: {port}")
    print()
    info("Next steps:")
    print(f"  1. Run 'e3cnc-cli update' to deploy runtime files")
    print(f"  2. Edit {printer_cfg} with your machine config")
    info("To use this instance: e3cnc-cli --instance {name} <command>")
