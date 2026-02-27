#!/usr/bin/env python3
"""
Dev Server Manager — macOS menu bar app.
Click a project to toggle it on/off. Both can run simultaneously.
Ctrl+Opt+Cmd+. to open the menu from anywhere.
"""

import json
import os
import signal
import subprocess
import threading
import time
import urllib.request
from pathlib import Path

import AppKit
import rumps

CHROME_LOCAL_STATE = os.path.expanduser("~/Library/Application Support/Google/Chrome/Local State")
STATE_FILE = Path(os.path.expanduser("~/.config/daily-digest/menubar_state.json"))

GITHUB_DIR = os.path.expanduser("~/Documents/GitHub")

CHROME_PROFILES = [
    {"dir": "Profile 1", "name": "Albert", "short": "AL"},
    {"dir": "Profile 17", "name": "kanguro.com", "short": "KNG"},
]

PROJECTS = [
    {
        "key": "daily",
        "label": "Daily Audio Digest",
        "icon": "🎙️",
        "dir": os.path.join(GITHUB_DIR, "daily-audio-digest"),
        "flask_cmd_plain": [".venv/bin/python", "-m", "backend", "serve", "--debug", "--port", "5001"],
        "backend_port": 5001,
        "vite_port": "5173",
        "browser_port": 5173,
        "default_mode": "plain",
    },
    {
        "key": "instagram",
        "label": "Instagram AI Bot",
        "icon": "📸",
        "dir": os.path.join(GITHUB_DIR, "instagram-ai-bot"),
        "flask_cmd_plain": [".venv/bin/python", "dashboard.py", "--port", "8000"],
        "flask_cmd_secure": [
            ".venv/bin/python",
            "scripts/secrets_vault.py",
            "exec",
            "--password-stdin",
            "--",
            ".venv/bin/python",
            "dashboard.py",
            "--port",
            "8000",
        ],
        "pre_start_cmds": [["scripts/dashboard_service.sh", "stop"]],
        "pre_stop_cmds": [["scripts/dashboard_service.sh", "stop"]],
        "backend_port": 8000,
        "vite_port": "5174",
        "browser_port": 5174,
        "default_mode": "secure",
    },
]


def _kill_proc(proc):
    """Safely kill a process and its children."""
    if proc and proc.poll() is None:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            pass


def _open_chrome(url):
    """Focus an existing Chrome tab matching the URL, or open a new one."""
    script = f'''
    tell application "Google Chrome"
        set targetURL to "{url}"
        set foundWindow to 0
        set foundTab to 0
        set winCount to count of windows
        repeat with winIdx from 1 to winCount
            set w to window winIdx
            set tabCount to count of tabs of w
            repeat with tabIdx from 1 to tabCount
                if URL of tab tabIdx of w starts with targetURL then
                    set foundWindow to winIdx
                    set foundTab to tabIdx
                    exit repeat
                end if
            end repeat
            if foundWindow > 0 then exit repeat
        end repeat

        if foundWindow > 0 then
            set active tab index of window foundWindow to foundTab
            set index of window foundWindow to 1
            activate
        else
            activate
            open location targetURL
        end if
    end tell
    '''
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=5)


def _wait_and_open(url, timeout=15):
    """Wait for a server to respond, then open it in Chrome."""
    for _ in range(timeout):
        time.sleep(1)
        try:
            urllib.request.urlopen(url, timeout=1)
            _open_chrome(url)
            return
        except Exception:
            pass


def _pids_listening_on_port(port):
    try:
        r = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"],
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        pids = []
        for line in r.stdout.splitlines():
            line = line.strip()
            if line.isdigit():
                pids.append(int(line))
        return pids
    except Exception:
        return []


def _is_port_listening(port):
    return bool(_pids_listening_on_port(port))


def _kill_pid(pid, sig):
    try:
        os.kill(pid, sig)
    except (ProcessLookupError, PermissionError):
        pass


def _kill_port_listeners(port):
    pids = _pids_listening_on_port(port)
    for pid in pids:
        _kill_pid(pid, signal.SIGTERM)
    if pids:
        time.sleep(0.4)
    for pid in _pids_listening_on_port(port):
        _kill_pid(pid, signal.SIGKILL)


def _read_dashboard_token_from_vault(proj, master_password):
    """Read DASHBOARD_API_TOKEN from vault using the provided master password."""
    if not master_password:
        return ""
    cmd = [
        ".venv/bin/python",
        "scripts/secrets_vault.py",
        "exec",
        "--password-stdin",
        "--",
        "/bin/sh",
        "-lc",
        'printf "%s" "${DASHBOARD_API_TOKEN:-}"',
    ]
    try:
        proc = subprocess.run(
            cmd,
            cwd=proj["dir"],
            input=(master_password + "\n").encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=8,
        )
    except Exception:
        return ""
    if proc.returncode != 0:
        return ""
    return proc.stdout.decode("utf-8", errors="ignore").strip()


def _get_chrome_state():
    """Returns (active_profile_dir, window_count)."""
    # Active profile from Local State
    profile_dir = None
    try:
        with open(CHROME_LOCAL_STATE) as f:
            state = json.load(f)
        profile_dir = state.get("profile", {}).get("last_used", "")
    except Exception:
        pass

    # Window count (without launching Chrome if not running)
    win_count = 0
    try:
        r = subprocess.run(
            [
                "osascript",
                "-e",
                """
            if application "Google Chrome" is running then
                tell application "Google Chrome" to return (count of windows) as text
            else
                return "0"
            end if
            """,
            ],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if r.stdout.strip().isdigit():
            win_count = int(r.stdout.strip())
    except Exception:
        pass

    return profile_dir, win_count


def _switch_chrome_profile(profile_dir, already_active):
    """Switch to a Chrome profile by finding its existing window, or opening a new one."""
    if already_active:
        subprocess.run(
            ["osascript", "-e", 'tell application "Google Chrome" to activate'],
            capture_output=True,
            timeout=5,
        )
        return

    _, win_count = _get_chrome_state()

    if win_count >= 2:
        subprocess.run(
            [
                "osascript",
                "-e",
                """
            tell application "Google Chrome"
                set index of window 2 to 1
                activate
            end tell
            """,
            ],
            capture_output=True,
            timeout=5,
        )
    else:
        subprocess.run(
            ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", f"--profile-directory={profile_dir}"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
        )


class DevManagerApp(rumps.App):
    def __init__(self):
        super().__init__("⚡", quit_button=None)
        self.procs = {}
        self.state = self._load_state()
        profile_dir, win_count = _get_chrome_state()
        self._chrome_profile_dir = profile_dir  # our view of active profile
        self._chrome_ls_profile = profile_dir  # last value seen in Local State
        self._chrome_win_count = win_count
        self._rebuild()
        self._setup_hotkey()
        self._profile_timer = rumps.Timer(self._poll_chrome, 1)
        self._profile_timer.start()

    # --- Chrome state ---

    def _poll_chrome(self, _):
        ls_profile, wcount = _get_chrome_state()
        changed = False

        # Only update active profile when Local State CHANGED
        # (= user switched profile manually in Chrome, not our AppleScript)
        if ls_profile != self._chrome_ls_profile:
            self._chrome_ls_profile = ls_profile
            self._chrome_profile_dir = ls_profile
            changed = True

        if wcount != self._chrome_win_count:
            self._chrome_win_count = wcount
            changed = True

        if changed:
            self._rebuild()

    def _profile_has_window(self, profile_dir):
        """Does this profile have at least one Chrome window open?"""
        if self._chrome_win_count == 0:
            return False
        if self._chrome_win_count == 1:
            # Only the active profile has a window
            return profile_dir == self._chrome_profile_dir
        # 2+ windows: both profiles have windows
        return True

    # --- Menu ---

    def _project(self, key):
        return next(p for p in PROJECTS if p["key"] == key)

    def _run_project_cmds(self, proj, cmd_key):
        for cmd in proj.get(cmd_key, []):
            try:
                subprocess.run(
                    cmd,
                    cwd=proj["dir"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                )
            except Exception:
                pass

    def _is_running(self, key):
        p = self.procs.get(key)
        if p is not None and p["flask"].poll() is None:
            return True
        proj = self._project(key)
        backend_on = _is_port_listening(proj.get("backend_port", proj["browser_port"]))
        vite_on = _is_port_listening(int(proj["vite_port"]))
        return backend_on or vite_on

    def _load_state(self):
        try:
            if STATE_FILE.exists():
                data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
        return {}

    def _save_state(self):
        try:
            STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
            STATE_FILE.write_text(json.dumps(self.state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        except Exception:
            pass

    def _preferred_mode(self, key, fallback="plain"):
        projects = self.state.get("project_modes", {})
        if not isinstance(projects, dict):
            return fallback
        mode = projects.get(key)
        if mode in {"plain", "secure"}:
            return mode
        return fallback

    def _set_preferred_mode(self, key, mode):
        if mode not in {"plain", "secure"}:
            return
        projects = self.state.setdefault("project_modes", {})
        if not isinstance(projects, dict):
            projects = {}
            self.state["project_modes"] = projects
        projects[key] = mode
        self._save_state()

    def _mode_label(self, mode):
        return "seguro" if mode == "secure" else "sin keys"

    def _set_mode_only(self, key, mode):
        proj = self._project(key)
        self._set_preferred_mode(key, mode)
        self._rebuild()
        rumps.notification("Dev Manager", proj["label"], f"Modo por defecto: {self._mode_label(mode)}")

    def _proc_mode(self, key):
        p = self.procs.get(key)
        if not p:
            return None
        return p.get("mode", "plain")

    def _rebuild(self):
        self.menu.clear()
        for proj in PROJECTS:
            key = proj["key"]
            on = self._is_running(key)
            mode = self._proc_mode(key)
            mode_suffix = " 🔒" if (on and mode == "secure") else ""
            label = f"{proj['icon']} {proj['label']}{mode_suffix}  {'✅' if on else '⚫'}"
            proj_menu = rumps.MenuItem(label)
            if on:
                proj_menu.add(
                    rumps.MenuItem(
                        f"Abrir {proj['label']}",
                        callback=lambda _, k=key: self._click(k),
                    )
                )
                proj_menu.add(
                    rumps.MenuItem(
                        f"Parar {proj['label']}",
                        callback=lambda _, k=key: self._stop(k),
                    )
                )
            elif proj.get("flask_cmd_secure"):
                preferred = self._preferred_mode(key, proj.get("default_mode", "plain"))
                proj_menu.add(
                    rumps.MenuItem(
                        f"Iniciar ({self._mode_label(preferred)})",
                        callback=lambda _, k=key, m=preferred: self._start(k, mode=m),
                    )
                )

                start_with = rumps.MenuItem("Iniciar con...")
                start_with.add(
                    rumps.MenuItem(
                        "Modo seguro",
                        callback=lambda _, k=key: self._start(k, mode="secure"),
                    )
                )
                start_with.add(
                    rumps.MenuItem(
                        "Modo sin keys",
                        callback=lambda _, k=key: self._start(k, mode="plain"),
                    )
                )
                proj_menu.add(start_with)

                default_mode = rumps.MenuItem("Modo por defecto")
                default_mode.add(
                    rumps.MenuItem(
                        f"Seguro{' ★' if preferred == 'secure' else ''}",
                        callback=lambda _, k=key: self._set_mode_only(k, "secure"),
                    )
                )
                default_mode.add(
                    rumps.MenuItem(
                        f"Sin keys{' ★' if preferred == 'plain' else ''}",
                        callback=lambda _, k=key: self._set_mode_only(k, "plain"),
                    )
                )
                proj_menu.add(default_mode)
            else:
                proj_menu.add(
                    rumps.MenuItem(
                        f"Iniciar {proj['label']}",
                        callback=lambda _, k=key: self._start(k, mode="plain"),
                    )
                )
            self.menu.add(proj_menu)
        self.menu.add(None)
        for cp in CHROME_PROFILES:
            has_window = self._profile_has_window(cp["dir"])
            indicator = "✅" if has_window else "⚫"
            label = f"🌐 {cp['name']}  {indicator}"
            self.menu.add(
                rumps.MenuItem(
                    label,
                    callback=lambda _, d=cp["dir"]: self._switch_profile(d),
                )
            )
        self.menu.add(None)
        self.menu.add(rumps.MenuItem("Quit", callback=self._quit))

        # Title bar: short profile indicator
        icons = [p["icon"] for p in PROJECTS if self._is_running(p["key"])]
        profile_short = ""
        for cp in CHROME_PROFILES:
            if cp["dir"] == self._chrome_profile_dir:
                profile_short = cp["short"]
                break
        if icons:
            self.title = " ".join(icons) + (f" {profile_short}" if profile_short else "")
        else:
            self.title = f"⚡{profile_short}" if profile_short else "⚡"

    # --- Click ---

    def _click(self, key):
        if self._is_running(key):
            proj = self._project(key)
            _open_chrome(f"http://localhost:{proj['browser_port']}")
        else:
            proj = self._project(key)
            mode = self._preferred_mode(key, proj.get("default_mode", "plain"))
            self._start(key, mode=mode)

    def _start(self, key, mode=None):
        proj = self._project(key)
        if mode is None:
            mode = proj.get("default_mode", "plain")

        secure_password = None
        dashboard_token = ""
        if mode == "secure":
            if not proj.get("flask_cmd_secure"):
                rumps.notification("Dev Manager", proj["label"], "Este proyecto no soporta modo seguro.")
                return
            resp = rumps.Window(
                title=f"{proj['label']} (seguro)",
                message="Master password del vault",
                default_text="",
                ok="Start",
                cancel=True,
                secure=True,
            ).run()
            if not resp.clicked:
                return
            secure_password = (resp.text or "").strip()
            if not secure_password:
                rumps.notification("Dev Manager", proj["label"], "Password vacía. Inicio cancelado.")
                return
            dashboard_token = _read_dashboard_token_from_vault(proj, secure_password)

        self._run_project_cmds(proj, "pre_start_cmds")

        flask_cmd = proj.get("flask_cmd_secure") if mode == "secure" else proj.get("flask_cmd_plain")
        if not flask_cmd:
            rumps.notification("Dev Manager", proj["label"], "Comando de inicio no configurado.")
            return

        flask = subprocess.Popen(
            flask_cmd,
            cwd=proj["dir"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.PIPE if mode == "secure" else subprocess.DEVNULL,
            start_new_session=True,
        )
        if mode == "secure" and flask.stdin is not None and secure_password is not None:
            try:
                flask.stdin.write((secure_password + "\n").encode("utf-8"))
                flask.stdin.flush()
                flask.stdin.close()
            except Exception:
                pass

        # Give backend a moment to fail fast (e.g. wrong master password)
        # before we spawn Vite.
        time.sleep(0.7)
        if flask.poll() is not None:
            msg = "No pudo arrancar backend seguro. Revisa la master password."
            if mode != "secure":
                msg = "No pudo arrancar backend."
            rumps.notification("Dev Manager", proj["label"], msg)
            return

        vite_env = os.environ.copy()
        if mode == "secure" and dashboard_token:
            vite_env["VITE_DASHBOARD_API_TOKEN"] = dashboard_token

        vite = subprocess.Popen(
            ["npx", "vite", "--port", proj["vite_port"]],
            cwd=os.path.join(proj["dir"], "frontend"),
            env=vite_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        self._set_preferred_mode(key, mode)
        self.procs[key] = {"flask": flask, "vite": vite, "mode": mode}
        self._rebuild()
        url = f"http://localhost:{proj['browser_port']}"
        threading.Thread(target=_wait_and_open, args=(url,), daemon=True).start()

    def _stop(self, key):
        proj = self._project(key)
        self._run_project_cmds(proj, "pre_stop_cmds")
        p = self.procs.pop(key, None)
        if p:
            _kill_proc(p["flask"])
            _kill_proc(p["vite"])
        backend_port = proj.get("backend_port", proj["browser_port"])
        _kill_port_listeners(backend_port)
        _kill_port_listeners(int(proj["vite_port"]))
        self._rebuild()

    # --- Chrome profile switch ---

    def _switch_profile(self, profile_dir):
        already_active = profile_dir == self._chrome_profile_dir
        # Optimistic update
        self._chrome_profile_dir = profile_dir
        self._rebuild()
        threading.Thread(
            target=_switch_chrome_profile,
            args=(profile_dir, already_active),
            daemon=True,
        ).start()

    # --- Hotkey ---

    def _setup_hotkey(self):
        """Ctrl+Opt+Cmd+. to open menu."""
        try:
            import ctypes
            import ctypes.util

            import objc
            from Foundation import NSDictionary

            lib = ctypes.cdll.LoadLibrary(ctypes.util.find_library("ApplicationServices"))
            func = lib.AXIsProcessTrustedWithOptions
            func.restype = ctypes.c_bool
            func.argtypes = [ctypes.c_void_p]
            opts = NSDictionary.dictionaryWithObject_forKey_(True, "AXTrustedCheckOptionPrompt")
            if not func(objc.pyobjc_id(opts)):
                return
        except Exception:
            return

        from AppKit import NSEvent

        CTRL = 1 << 18
        OPT = 1 << 19
        CMD = 1 << 20
        KEYDOWN = 1 << 10
        PERIOD = 47

        def on_key(event):
            m = event.modifierFlags()
            if (m & CTRL) and (m & OPT) and (m & CMD) and event.keyCode() == PERIOD:
                try:
                    self._nsapp.nsstatusitem.button().performClick_(None)
                except Exception:
                    pass

        NSEvent.addGlobalMonitorForEventsMatchingMask_handler_(KEYDOWN, on_key)

    # --- Quit ---

    def _quit(self, _):
        for key in list(self.procs.keys()):
            self._stop(key)
        rumps.quit_application()


if __name__ == "__main__":
    AppKit.NSApplication.sharedApplication().setActivationPolicy_(AppKit.NSApplicationActivationPolicyAccessory)
    DevManagerApp().run()
