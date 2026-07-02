"""Tests for _e3cnc_deploy.py utility functions."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from _e3cnc_deploy import (
    Release, _format_size, _github_api_request, get_latest_release_assets,
    format_release_list, generate_admin_page, _get_local_ip,
    fix_moonraker_config, prune_backups, ensure_sudoers,
    BACKUPS_DIR, SUDOERS_PATH,
)


# ── _format_size ──────────────────────────────────────────────────────

class TestFormatSize:
    def test_bytes(self):
        assert _format_size(500) == "500 B"

    def test_kilobytes(self):
        assert _format_size(2048) == "2.0 KB"

    def test_megabytes(self):
        assert _format_size(5 * 1024 * 1024) == "5.0 MB"

    def test_gigabytes(self):
        assert _format_size(3 * 1024 ** 3) == "3.0 GB"


# ── _github_api_request ──────────────────────────────────────────────

class TestGithubApiRequest:
    def test_returns_parsed_json_on_success(self):
        mock_resp = MagicMock(spec=['read', '__enter__', '__exit__'])
        mock_resp.read.return_value = b'{"name": "test"}'
        mock_resp.__enter__.return_value = mock_resp
        with patch("_e3cnc_deploy.urlopen", return_value=mock_resp):
            result = _github_api_request("repos/test")
            assert result == {"name": "test"}

    def test_returns_none_on_error(self):
        with patch("_e3cnc_deploy.urlopen", side_effect=OSError("no network")):
            with patch("_e3cnc_deploy.warn"):
                result = _github_api_request("repos/test")
                assert result is None

    def test_returns_none_on_json_error(self):
        mock_resp = MagicMock(spec=['read', '__enter__', '__exit__'])
        mock_resp.read.return_value = b"not json"
        mock_resp.__enter__.return_value = mock_resp
        with patch("_e3cnc_deploy.urlopen", return_value=mock_resp):
            with patch("_e3cnc_deploy.warn"):
                result = _github_api_request("repos/test")
                assert result is None


# ── get_latest_release_assets ────────────────────────────────────────

class TestGetLatestReleaseAssets:
    def test_returns_assets(self):
        mock_data = {"assets": [{"name": "e3cnc-stack-v0.9.0.tar.zst"}, {"name": "file.zip"}]}
        with patch("_e3cnc_deploy._github_api_request", return_value=mock_data):
            assets = get_latest_release_assets()
            assert assets == [{"name": "e3cnc-stack-v0.9.0.tar.zst"}, {"name": "file.zip"}]

    def test_returns_none_when_no_assets_key(self):
        with patch("_e3cnc_deploy._github_api_request", return_value={"tag": "v1"}):
            assets = get_latest_release_assets()
            assert assets is None

    def test_returns_none_on_api_failure(self):
        with patch("_e3cnc_deploy._github_api_request", return_value=None):
            assets = get_latest_release_assets()
            assert assets is None


# ── format_release_list ──────────────────────────────────────────────

class TestFormatReleaseList:
    def test_includes_headers(self):
        releases = [Release(version="v0.9.0", path=Path("/tmp"))]
        result = format_release_list(releases)
        assert "Installed releases" in result
        assert "v0.9.0" in result

    def test_shows_active_release(self, tmp_path):
        active_path = tmp_path / "v0.9.0"
        active_path.mkdir()
        link = tmp_path / "current"
        link.symlink_to(active_path)
        releases = [Release(version="v0.9.0", path=active_path)]
        with patch("_e3cnc_deploy.CURRENT_SYMLINK", link):
            result = format_release_list(releases)
            assert "active" in result

    def test_lists_multiple_releases(self, tmp_path):
        releases = [
            Release(version="v0.9.0", path=tmp_path / "v0.9.0", size_bytes=1024),
            Release(version="v0.8.0", path=tmp_path / "v0.8.0", size_bytes=512),
            Release(version="v0.7.0", path=tmp_path / "v0.7.0", size_bytes=2048),
        ]
        result = format_release_list(releases)
        assert "v0.9.0" in result
        assert "v0.8.0" in result
        assert "v0.7.0" in result
        assert "Total:" in result

    def test_handles_no_created_at(self):
        release = Release(version="v0.9.0", path=Path("/tmp"), created_at=None)
        result = format_release_list([release])
        assert "unknown" in result


# ── generate_admin_page ─────────────────────────────────────────────

class TestGenerateAdminPage:
    def test_creates_html_with_instances(self, tmp_path):
        from _e3cnc_shared import Instance
        inst = Instance(
            name="testcnc",
            printer_data_dir="/tmp/data",
            config_dir="/tmp/data/config",
            moonraker_conf="/tmp/data/config/moonraker.conf",
            moonraker_log="/tmp/data/logs/moonraker.log",
            scripts_dir="/tmp/data/scripts",
            macros_dir="/tmp/data/config/E3CNC/macros",
            E3CNC_dir="/tmp/data/config/E3CNC",
            printer_cfg="/tmp/data/config/printer.cfg",
            web_root="/tmp/frontend",
            is_running=True,
        )
        admin_dir = tmp_path / "admin"
        with patch("_e3cnc_deploy.ADMIN_PAGE_DIR", admin_dir):
            with patch("_e3cnc_shared.detect_instances", return_value=[inst]):
                with patch("_e3cnc_deploy._get_local_ip", return_value="192.168.1.1"):
                    with patch("_e3cnc_deploy.get_current_release", return_value=None):
                        generate_admin_page()
                        index = admin_dir / "index.html"
                        assert index.exists()
                        html = index.read_text()
                        assert "testcnc" in html
                        assert "192.168.1.1" in html
                        assert "E3CNC" in html


# ── _get_local_ip ────────────────────────────────────────────────────

class TestGetLocalIp:
    def test_returns_string(self):
        ip = _get_local_ip()
        assert ip is not None
        assert isinstance(ip, str)
        assert len(ip) > 0

    def test_fallback_to_hostname(self):
        with patch("socket.socket") as mock_sock:
            sock = MagicMock()
            sock.connect.side_effect = OSError("no route")
            mock_sock.return_value = sock
            result = _get_local_ip()
            assert result is not None


# ── fix_moonraker_config ─────────────────────────────────────────────

class TestFixMoonrakerConfig:
    def test_merges_duplicate_sections(self, tmp_path):
        """Duplicate [file_manager] sections should be merged into one."""
        conf = tmp_path / "moonraker.conf"
        conf.write_text("[server]\nhost: 0.0.0.0\nport: 7125\n\n[file_manager]\nenable_object_processing: True\n\n[octoprint_compat]\n\n# E3CNC auto-generated\n[file_manager]\nconfig_path: /home/user/data/config\n\n[database]\ndatabase_path: /home/user/data/database\n")
        assert fix_moonraker_config(str(conf)) is True
        result = conf.read_text()
        assert result.count("[file_manager]") == 1
        assert "enable_object_processing: True" in result
        assert "config_path:" in result
        assert "[octoprint_compat]" in result  # sections between are preserved
        assert "[database]" in result

    def test_no_duplicates_returns_true(self, tmp_path):
        """Config with no duplicate sections should be left unchanged."""
        conf = tmp_path / "moonraker.conf"
        conf.write_text("[server]\nport: 7125\n[file_manager]\nconfig_path: /home/user\n")
        assert fix_moonraker_config(str(conf)) is True
        assert conf.read_text() == "[server]\nport: 7125\n[file_manager]\nconfig_path: /home/user\n"

    def test_dry_run_does_not_modify(self, tmp_path):
        """Dry-run should report duplicates without modifying the file."""
        conf = tmp_path / "moonraker.conf"
        conf.write_text("[file_manager]\na: 1\n[file_manager]\nb: 2\n")
        assert fix_moonraker_config(str(conf), dry_run=True) is True
        assert conf.read_text().count("[file_manager]") == 2

    def test_missing_file_returns_false(self):
        assert fix_moonraker_config("/nonexistent/path") is False


# ── prune_backups ───────────────────────────────────────────────────

class TestPruneBackups:
    def test_keeps_n_most_recent(self, tmp_path):
        """Older backups beyond keep count should be pruned."""
        backups = tmp_path / "backups"
        backups.mkdir(parents=True)
        for i in range(5):
            (backups / f"pre-update-2026070{i}-120000").mkdir()
        with patch("_e3cnc_deploy.BACKUPS_DIR", backups):
            with patch("_e3cnc_deploy.info"):
                pruned = prune_backups(keep=3)
        assert len(pruned) == 2  # 5 - 3 = 2 pruned
        # The oldest (smallest timestamp) should be pruned
        remaining = sorted(backups.iterdir())
        assert len(remaining) == 3

    def test_empty_dir_no_prune(self):
        with patch("_e3cnc_deploy.BACKUPS_DIR", Path("/nonexistent")):
            pruned = prune_backups()
        assert pruned == []

    def test_dry_run_does_not_delete(self, tmp_path):
        backups = tmp_path / "backups"
        backups.mkdir(parents=True)
        for i in range(4):
            (backups / f"backup-{i}").mkdir()
        with patch("_e3cnc_deploy.BACKUPS_DIR", backups):
            with patch("_e3cnc_deploy.info"):
                pruned = prune_backups(keep=2, dry_run=True)
        assert len(pruned) == 2  # Would prune 2
        assert len(list(backups.iterdir())) == 4  # None actually deleted


# ── ensure_sudoers ───────────────────────────────────────────────────

class TestEnsureSudoers:
    def test_skips_when_file_already_correct(self, tmp_path):
        """If file exists and matches expected content, return True without changes."""
        sudoers = tmp_path / "sudoers.d" / "e3cnc"
        sudoers.parent.mkdir(parents=True)
        from _e3cnc_deploy import SUDOERS_CONTENT
        content = SUDOERS_CONTENT.format(user="testuser")
        sudoers.write_text(content)
        with patch("_e3cnc_deploy.SUDOERS_PATH", str(sudoers)):
            with patch("os.environ", {"USER": "testuser"}):
                assert ensure_sudoers() is True

    def test_handles_permission_error_gracefully(self, tmp_path):
        """If file exists but is not readable (e.g. root-owned 0440), skip."""
        sudoers = tmp_path / "sudoers.d" / "e3cnc"
        sudoers.parent.mkdir(parents=True)
        sudoers.write_text("some content")
        # Simulate PermissionError on read
        with patch("pathlib.Path.read_text", side_effect=PermissionError("Permission denied")):
            with patch("os.environ", {"USER": "testuser"}):
                with patch("pathlib.Path.exists", return_value=True):
                    assert ensure_sudoers() is True  # Treated as already correct

    def test_installs_when_file_missing(self, tmp_path):
        """If file doesn't exist, should attempt to create it."""
        sudoers = tmp_path / "sudoers.d" / "e3cnc"
        with patch("_e3cnc_deploy.SUDOERS_PATH", str(sudoers)):
            with patch("os.environ", {"USER": "testuser"}):
                with patch("subprocess.run") as mock_run:
                    mock_run.return_value = MagicMock(returncode=0)
                    def _copy_side_effect(cmd, **kw):
                        if cmd[0] == "sudo" and cmd[1] == "cp" and len(cmd) == 4:
                            src, dst = cmd[2], cmd[3]
                            Path(dst).parent.mkdir(parents=True, exist_ok=True)
                            import shutil
                            shutil.copy2(src, dst)
                        return MagicMock(returncode=0)
                    mock_run.side_effect = _copy_side_effect
                    assert ensure_sudoers() is True
                    assert sudoers.exists()

    def test_returns_false_on_no_user(self):
        with patch("os.environ", {}):
            assert ensure_sudoers() is False
