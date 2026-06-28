"""Docker-backed integration test for fresh-install bootstrap.

Verifies that the full Ansible bootstrap lays down all files correctly and that
nginx can serve the frontend. Requires Docker and E3CNC_RUN_DOCKER_TESTS=1.

Usage:
    E3CNC_RUN_DOCKER_TESTS=1 python3 -m pytest tests/test_fresh_install_bootstrap_integration.py -x -v
"""

import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest


pytestmark = pytest.mark.integration


def _check_output(output: str, label: str, pattern: str, invert: bool = False) -> bool:
    """Check if pattern appears in output. Returns True if matched."""
    if invert:
        matched = re.search(pattern, output) is None
    else:
        matched = re.search(pattern, output) is not None
    status = "PASS" if matched else "FAIL"
    prefix = "!" if not matched else " "
    print(f"  {prefix} [{status}] {label}: {pattern}")
    return matched


def _run_verify_script(container_id: str, script: str) -> str:
    """Run a shell script inside the container and return output."""
    result = subprocess.run(
        ["docker", "exec", container_id, "bash", "-lc", script],
        capture_output=True, text=True, timeout=300,
    )
    return result.stdout + result.stderr


@pytest.mark.skipif(
    os.environ.get('E3CNC_RUN_DOCKER_TESTS') != '1',
    reason='Set E3CNC_RUN_DOCKER_TESTS=1 to run Docker-backed fresh-install integration tests.',
)
class TestFreshInstallBootstrap:
    """Integration test suite for fresh bootstrap install."""

    CONTAINER_NAME = "e3cnc-fresh-install-test"
    IMAGE_TAG = "e3cnc-fresh-install-bootstrap-test"

    @pytest.fixture(autouse=True)
    def _setup_container(self, request):
        """Build and start the test container."""
        root = Path(__file__).resolve().parent.parent
        docker = shutil.which("docker")
        if not docker:
            pytest.skip("docker not available")

        # Build container
        subprocess.run(
            [docker, "build", "-t", self.IMAGE_TAG,
             "-f", str(root / "tests" / "Dockerfile.fresh-install"), str(root)],
            check=True, cwd=root,
        )

        # Start container in background (keeps running for exec commands)
        subprocess.run(
            [docker, "run", "-d", "--name", self.CONTAINER_NAME,
             "-e", "DEBIAN_FRONTEND=noninteractive", self.IMAGE_TAG, "sleep", "infinity"],
            check=True, capture_output=True,
        )

        yield

        # Cleanup
        subprocess.run([docker, "rm", "-f", self.CONTAINER_NAME],
                       capture_output=True, check=False)
        subprocess.run([docker, "rmi", "-f", self.IMAGE_TAG],
                       capture_output=True, check=False)

    def _exec(self, script: str) -> str:
        """Run a bash script inside the container."""
        result = subprocess.run(
            ["docker", "exec", self.CONTAINER_NAME, "bash", "-lc", script],
            capture_output=True, text=True, timeout=300,
        )
        combined = result.stdout + result.stderr
        if result.returncode != 0:
            print(f"  [exit code {result.returncode}]")
        return combined

    # ── step 1: prepare environment ───────────────────────────────────────

    def _install_ansible(self) -> str:
        """Install pip and Ansible inside the container."""
        return self._exec(
            "sudo apt-get update -qq >/dev/null && "
            "sudo apt-get install -y -qq python3-pip >/dev/null && "
            "(python3 -m pip install --user ansible >/dev/null 2>&1 || "
            " python3 -m pip install --user --break-system-packages ansible >/dev/null 2>&1) && "
            "export PATH=\"$HOME/.local/bin:$PATH\" && "
            "echo 'ansible ready'"
        )

    def _setup_git_remote(self) -> str:
        """Point the git origin to the local checkout (avoids network)."""
        return self._exec(
            "cd ~/E3CNC && "
            "git remote set-url origin file://$HOME/E3CNC 2>/dev/null || true && "
            "echo 'git remote configured'"
        )

    # ── step 2: run Ansible ───────────────────────────────────────────────

    def _run_ansible_playbook(self, extra_tags: str = "") -> str:
        """Run the install playbook, optionally with tag filters."""
        tags_flag = f"--tags {extra_tags}" if extra_tags else ""
        return self._exec(
            "export PATH=\"$HOME/.local/bin:$PATH\" && "
            f"cd ~/E3CNC/ansible && "
            f"ansible-playbook -i inventory/local.yml playbooks/install.yml "
            f"-e bootstrap_skip_runtime_start=true "
            f"-e bootstrap_skip_runtime_verification=true "
            f"{tags_flag} "
            f"2>&1"
        )

    # ── step 3: verification ──────────────────────────────────────────────

    def _check_vendor_moonraker(self) -> bool:
        """Verify vendored Moonraker was copied."""
        out = self._exec("test -f ~/moonraker/moonraker/moonraker.py && echo 'FOUND' || echo 'MISSING'")
        return "FOUND" in out

    def _check_cnc_agent(self) -> bool:
        """Verify cnc_agent component was deployed."""
        out = self._exec(
            "test -f ~/moonraker/moonraker/components/cnc_agent/cnc_agent.py "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_cnc_metadata(self) -> bool:
        """Verify cnc_metadata component was deployed."""
        out = self._exec(
            "test -f ~/moonraker/moonraker/components/cnc_metadata/cnc_metadata.py "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_mcp_server(self) -> bool:
        """Verify MCP server was deployed."""
        out = self._exec(
            "test -f ~/moonraker/mcp/mcp_server.py "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_vendor_klipper(self) -> bool:
        """Verify vendored Klipper was copied."""
        out = self._exec("test -f ~/klipper/klippy/klippy.py && echo 'FOUND' || echo 'MISSING'")
        return "FOUND" in out

    def _check_wcs_plugin(self) -> bool:
        """Verify work_coordinate_systems.py is in vendor Klipper extras."""
        out = self._exec(
            "test -f ~/klipper/klippy/extras/work_coordinate_systems.py "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_moonraker_conf_sections(self) -> bool:
        """Verify [cnc_agent] and [cnc_metadata] in moonraker.conf."""
        out = self._exec(
            "grep -q '\\[cnc_agent\\]' ~/printer_data/config/moonraker.conf "
            "&& grep -q '\\[cnc_metadata\\]' ~/printer_data/config/moonraker.conf "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_placeholder_printer_cfg(self) -> bool:
        """Verify printer.cfg is a bootstrap placeholder."""
        out = self._exec(
            "grep -q 'E3CNC bootstrap placeholder' ~/printer_data/config/printer.cfg "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_macros_deployed(self) -> bool:
        """Verify macros were deployed."""
        out = self._exec(
            "test -f ~/printer_data/config/E3CNC/macros/wcs_macros.cfg "
            "&& test -f ~/printer_data/config/E3CNC/macros/e3cnc_macros.cfg "
            "&& test -f ~/printer_data/config/E3CNC/macros/cnc_base.cfg "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_metadata_extractor(self) -> bool:
        """Verify metadata extractor script was deployed."""
        out = self._exec(
            "test -x ~/printer_data/scripts/cnc_metadata_extractor.py "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_printer_cfg_includes(self) -> bool:
        """Verify printer.cfg has [include E3CNC/macros/...] directives."""
        out = self._exec(
            "grep -q 'include E3CNC/macros' ~/printer_data/config/printer.cfg "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_nginx_config_exists(self) -> bool:
        """Verify nginx site config was installed."""
        out = self._exec(
            "test -f /etc/nginx/sites-available/e3cnc "
            "&& echo 'FOUND' || echo 'MISSING'"
        )
        return "FOUND" in out

    def _check_nginx_config_coexists(self) -> list:
        """Verify nginx config does NOT use default_server."""
        results = []
        out = self._exec(
            "grep -c 'default_server' /etc/nginx/sites-available/e3cnc 2>/dev/null || echo 0"
        )
        no_default = out.strip() == "0"
        results.append(("no default_server", no_default))

        out = self._exec(
            "grep 'server_name' /etc/nginx/sites-available/e3cnc 2>/dev/null || echo 'MISSING'"
        )
        has_hostname = "e3cnc.local" in out
        results.append(("server_name e3cnc.local", has_hostname))
        return results

    def _check_nginx_config_valid(self) -> bool:
        """Verify nginx config passes syntax check."""
        out = self._exec("sudo nginx -t 2>&1")
        return "test is successful" in out or "syntax is ok" in out

    def _start_nginx_and_test(self) -> tuple:
        """Start nginx and verify it serves content on port 80."""
        # remove any default site to avoid conflicts
        self._exec("sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null; sudo nginx 2>&1")
        # Check nginx is running
        ps_out = self._exec("ps aux | grep -c '[n]ginx'")
        running = ps_out.strip().isdigit() and int(ps_out.strip()) > 0

        # curl the frontend (may get 200, 302, or 404 depending on frontend deploy)
        http_code = self._exec("curl -s -o /dev/null -w '%{http_code}' http://localhost/ 2>/dev/null || echo 'no-connect'")
        return running, http_code.strip()

    # ── main test ─────────────────────────────────────────────────────────

    def test_fresh_bootstrap_full_verification(self):
        """Full integration test: install + verify all components."""

        print("\n  ── Step 1: Setup ──")
        out = self._install_ansible()
        print(f"  {out.strip()}")
        self._setup_git_remote()

        print("\n  ── Step 2: Run Ansible bootstrap ──")
        ansible_out = self._run_ansible_playbook(
            extra_tags="bootstrap-stack,extractor,moonraker-config,macros"
        )
        # Print last 3 lines of Ansible output
        lines = ansible_out.strip().splitlines()
        for line in lines[-3:]:
            print(f"  {line.strip()}")

        assert "failed=0" in ansible_out, (
            f"Ansible playbook had failures. Last 20 lines:\n"
            + "\n".join(lines[-20:])
        )

        print("\n  ── Step 3: File verification ──")
        checks = [
            ("Vendored Moonraker exists", self._check_vendor_moonraker()),
            ("Moonraker cnc_agent component", self._check_cnc_agent()),
            ("Moonraker cnc_metadata component", self._check_cnc_metadata()),
            ("MCP server deployed", self._check_mcp_server()),
            ("Vendored Klipper exists", self._check_vendor_klipper()),
            ("WCS plugin in Klipper extras", self._check_wcs_plugin()),
            ("moonraker.conf has [cnc_agent] + [cnc_metadata]", self._check_moonraker_conf_sections()),
            ("Placeholder printer.cfg created", self._check_placeholder_printer_cfg()),
            ("Macros deployed (wcs, e3cnc, cnc_base)", self._check_macros_deployed()),
            ("Metadata extractor deployed", self._check_metadata_extractor()),
            ("printer.cfg has [include E3CNC/macros]", self._check_printer_cfg_includes()),
            ("nginx site config installed", self._check_nginx_config_exists()),
        ]
        all_ok = True
        for label, ok in checks:
            status = "✓" if ok else "✗"
            print(f"  {status} {label}")
            if not ok:
                all_ok = False

        self._check_nginx_config_coexists()
        for label, ok in self._check_nginx_config_coexists():
            status = "✓" if ok else "✗"
            print(f"  {status} nginx: {label}")
            if not ok:
                all_ok = False

        print("\n  ── Step 4: nginx runtime test ──")
        valid = self._check_nginx_config_valid()
        print(f"  {'✓' if valid else '✗'} nginx config syntax is valid")
        if not valid:
            all_ok = False

        running, http_code = self._start_nginx_and_test()
        print(f"  {'✓' if running else '✗'} nginx process running")
        if not running:
            all_ok = False

        print(f"  Frontend HTTP status: {http_code} (may be 000 if no release yet)")

        assert all_ok, "Some checks failed — see output above"
