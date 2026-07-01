"""Tests for _e3cnc_deploy.py utility functions."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from _e3cnc_deploy import (
    Release, _format_size, _github_api_request, get_latest_release_assets,
    format_release_list, generate_admin_page, _get_local_ip,
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
        mock_data = {"assets": [{"name": "file.zip"}]}
        with patch("_e3cnc_deploy._github_api_request", return_value=mock_data):
            assets = get_latest_release_assets()
            assert assets == [{"name": "file.zip"}]

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
