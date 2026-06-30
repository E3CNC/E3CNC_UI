"""Minimal terminal input — read single keys, handle arrow escape sequences.

Usage:
    key = read_key()  # blocks until a key is pressed
    Returns: 'q', 'UP', 'DOWN', 'ENTER', '1', 'a', etc.
"""

import sys
import termios
import tty
import select
import atexit

_old_term: list = []
_restored = False


def _setup() -> None:
    """Switch stdin to raw mode (input only) so read() returns immediately."""
    if not sys.stdin.isatty() or _restored:
        return
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    _old_term.append(old)
    new = termios.tcgetattr(fd)
    new[tty.LFLAG] &= ~(termios.ECHO | termios.ICANON | termios.ISIG)
    new[tty.CC][termios.VMIN] = 1
    new[tty.CC][termios.VTIME] = 0
    termios.tcsetattr(fd, termios.TCSADRAIN, new)


def _restore() -> None:
    """Restore terminal to original settings."""
    global _restored
    if _restored:
        return
    _restored = True
    if _old_term:
        for saved in reversed(_old_term):
            try:
                termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, saved)
            except (termios.error, OSError, ValueError):
                pass
        _old_term.clear()


atexit.register(_restore)


def read_key() -> str:
    """Read one keypress. Returns a string like 'q', 'UP', 'DOWN', 'ENTER', etc."""
    if not sys.stdin.isatty():
        try:
            ch = sys.stdin.read(1)
        except (OSError, ValueError):
            return ""
        return ch

    _setup()
    fd = sys.stdin.fileno()

    try:
        b0 = sys.stdin.buffer.read(1)
    except (OSError, ValueError):
        return ""

    if not b0:
        return ""

    # Escape sequences
    if b0 == b"\x1b":
        # Wait for rest of sequence (up to 3 more bytes, 200ms total)
        rest = b""
        for _ in range(3):
            if select.select([fd], [], [], 0.2)[0]:
                try:
                    rest += sys.stdin.buffer.read(1)
                except (OSError, ValueError):
                    break
            else:
                break

        if rest == b"[A":
            return "UP"
        elif rest == b"[B":
            return "DOWN"
        elif rest == b"[C":
            return "RIGHT"
        elif rest == b"[D":
            return "LEFT"
        elif rest == b"[H":
            return "HOME"
        elif rest == b"[F":
            return "END"
        elif rest == b"[2~":
            return "INSERT"
        elif rest == b"[3~":
            return "DELETE"
        elif rest == b"[5~":
            return "PAGEUP"
        elif rest == b"[6~":
            return "PAGEDOWN"
        else:
            # Unknown escape — return as-is
            return b0.decode() + rest.decode()

    # Enter/Return
    if b0 in (b"\r", b"\n"):
        return "ENTER"

    # Tab
    if b0 == b"\t":
        return "TAB"

    # Backspace
    if b0 in (b"\x7f", b"\x08"):
        return "BACKSPACE"

    # Ctrl+C
    if b0 == b"\x03":
        return "CTRLC"

    return b0.decode()


def restore_terminal() -> None:
    """Restore terminal and prevent further _setup() calls."""
    _restore()


def enable_echo() -> None:
    """Temporarily enable echo for input() calls within raw mode context."""
    # We restore terminal fully since we re-setup after the call
    _restore()
