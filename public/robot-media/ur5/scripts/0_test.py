import socket
import subprocess
import sys
import time
from rtde_control import RTDEControlInterface
from rtde_receive import RTDEReceiveInterface
from rtde_io import RTDEIOInterface

# Configuration
ROBOT_IP = "192.168.1.123"  # Your UR5 controller IP
ROBOTIQ_PORT = 63352        # Robotiq URCap daemon port on UR5

# Robotiq 2F-85 / 2F-140 Speed & Force Settings (Range: 0 to 255)
# Speed: 0 = ~20 mm/s (slowest, ~4.2s stroke) | 255 = ~150 mm/s (fastest, ~0.55s stroke)
# Force: 0 = ~20 N (~4.5 lbs gentle pinch, finger-safe) | 255 = ~235 N (~53 lbs max clamping force)
ROBOTIQ_SPEED = 50
ROBOTIQ_FORCE = 10

# Speed Settings (place at top of file or right inside main):
UR5_SPEED_SLIDER = 1.00  # Range: 0.01 (1%) to 1.00 (100% max slider override)
UR5_MOVEJ_SPEED = 1.05   # Range: 0.01 to 3.14 rad/s (1.05 rad/s = 60 deg/s standard UR default)
UR5_MOVEJ_ACCEL = 1.40   # Range: 0.01 to 8.00 rad/s^2 (1.40 rad/s^2 = standard UR default)

def describe_gripper_settings(speed: int, force: int) -> str:
    speed_pct = round((speed / 255.0) * 100.0, 1)
    force_pct = round((force / 255.0) * 100.0, 1)
    approx_mm_s = round(20.0 + (speed / 255.0) * 130.0, 1)
    approx_newtons = round(20.0 + (force / 255.0) * 215.0, 1)
    if force == 0:
        force_label = "minimum gentle pinch"
    elif force <= 50:
        force_label = "light grasp"
    elif force <= 150:
        force_label = "medium clamping force"
    elif force < 255:
        force_label = "heavy clamping force"
    else:
        force_label = "MAX clamping force"
    return (
        f"Speed={speed}/255 ({speed_pct}%, ~{approx_mm_s} mm/s) | "
        f"Force={force}/255 ({force_pct}%, ~{approx_newtons} N - {force_label})"
    )

# Safe upright ready pose matched to your current base revolution (-2*pi = -6.2832 rad)
# and positive elbow (+1.5708 rad = +90 deg) so the arm doesn't spin 314 deg or flip its elbow:
# # [Base: -360 deg (0 deg visual), Shoulder: -90 deg, Elbow: +90 deg, Wrist 1: -90 deg, Wrist 2: -90 deg, Wrist 3: 0 deg]
# TARGET_BASE_JOINTS = [-6.2832, -1.5708, 1.5708, -1.5708, -1.5708, 0.0]

# Centered Base (0.0) and Wrist 3 (0.0), with upright non-singular arm configuration:
TARGET_BASE_JOINTS = [0.0, -1.5708, 1.5708, -1.5708, -1.5708, 0.0]

ROBOT_IP = "192.168.1.123"

REQUIRED_PORTS = {
    # Port 29999 (Dashboard Server): Plain-text system management interface.
    # Used for everything you can tap and do on the teach pendant: powering on the arm, releasing brakes, clearing protective stop popups, and checking system states.
    29999: "UR Dashboard Server",

    # Port 30002 (Secondary Client): Raw URScript execution channel.
    # Because Port 30004 (RTDE) only writes numbers into memory registers and cannot move motors on its own,
    # RTDEControlInterface connects to Port 30002 on startup and uploads ur_rtde's built-in 'rtde_control.script'
    # into the UR5's RAM. That script runs a loop on the UR5 that reads the Port 30004 registers and calls movej/servoj.
    30002: "UR Secondary Client (Script Upload)",

    # Port 30004 (RTDE): Deterministic 125 Hz binary data pipe.
    # Streams live joint states out to your computer and streams target joint positions/velocities/speed-slider values in.
    30004: "UR RTDE (Real-Time Data Exchange)",

    # Port 63352 (Robotiq URCap Server): Plain-text TCP socket bridge to the internal USB-to-RS485 gripper cable.
    # Accepts SET/GET commands (POSITION, SPEED, FORCE, STATUS, OBJECT) independently of the UR5 arm controller.
    63352: "Robotiq 2F Gripper Socket Server",
}

def check_ping(ip: str) -> bool:
    print(f"1. Pinging {ip}...")
    res = subprocess.run(["ping", "-c", "2", "-t", "2", ip], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode == 0:
        print("   [OK] Host is reachable on the network.")
        return True
    else:
        print("   [FAIL] Cannot ping UR5. Check Ethernet cable, IP address, and subnet mask.")
        return False

def check_ports(ip: str) -> bool:
    print("\n2. Checking required TCP ports...")
    all_open = True
    for port, desc in REQUIRED_PORTS.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        result = sock.connect_ex((ip, port))
        if result == 0:
            print(f"   [OK] Port {port} ({desc}) is OPEN.")
        else:
            print(f"   [FAIL] Port {port} ({desc}) is CLOSED or unreachable.")
            all_open = False
        sock.close()
    return all_open

ROBOT_MODES = {
    -1: "NO_CONTROLLER",
    0: "DISCONNECTED",
    1: "CONFIRM_SAFETY",
    2: "BOOTING",
    3: "POWER_OFF (Robot arm power is off; go to Teach Pendant -> Initialize Robot -> ON -> START)",
    4: "POWER_ON (Powered on, waiting for brakes to be released)",
    5: "IDLE (Powered on, brakes still engaged; press START on Teach Pendant)",
    6: "BACKDRIVE",
    7: "RUNNING (Normal operational mode - Powered on, brakes released, ready for scripts)",
    8: "UPDATING_FIRMWARE",
}

SAFETY_MODES = {
    1: "NORMAL",
    2: "REDUCED",
    3: "PROTECTIVE_STOP (Clear popup on Teach Pendant)",
    4: "RECOVERY",
    5: "SAFEGUARD_STOP",
    6: "SYSTEM_EMERGENCY_STOP (Physical E-Stop pressed)",
    7: "ROBOT_EMERGENCY_STOP (Teach Pendant E-Stop pressed)",
    8: "VIOLATION",
    9: "FAULT",
}

ROBOTIQ_STA_CODES = {
    0: "Gripper is in reset / not activated",
    1: "Activation in progress",
    3: "Activation complete (Ready)",
}

def check_state_read(ip: str) -> bool:
    print("\n3. Reading live state via RTDE (no motion)...")
    ready_for_motion = False
    try:
        rtde_r = RTDEReceiveInterface(ip)
        q = rtde_r.getActualQ()
        mode = rtde_r.getRobotMode()
        safety = rtde_r.getSafetyMode()
        mode_desc = ROBOT_MODES.get(mode, "UNKNOWN")
        safety_desc = SAFETY_MODES.get(safety, "UNKNOWN")
        print(f"   [OK] Connected to RTDE!")
        print(f"   Current Robot Mode:  {mode} -> {mode_desc}")
        print(f"   Current Safety Mode: {safety} -> {safety_desc}")
        print(f"   Current Joint Angles (rad): {[round(val, 4) for val in q]}")
        ready_for_motion = (mode == 7 and safety in (1, 2))
    except Exception as e:
        print(f"   [FAIL] RTDE read failed: {e}")

    print("\n4. Querying Robotiq Gripper status (no motion)...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2.0)
        sock.connect((ip, 63352))
        sock.sendall(b"GET STA\n")
        sta_raw = sock.recv(64).decode("utf-8").strip()
        sock.sendall(b"GET POS\n")
        pos_raw = sock.recv(64).decode("utf-8").strip()
        sock.sendall(b"GET SPE\n")
        spe_raw = sock.recv(64).decode("utf-8").strip()
        sock.sendall(b"GET FOR\n")
        for_raw = sock.recv(64).decode("utf-8").strip()

        sta_val = int(sta_raw.split()[-1]) if "STA" in sta_raw else -1
        pos_val = int(pos_raw.split()[-1]) if "POS" in pos_raw else -1
        spe_val = int(spe_raw.split()[-1]) if "SPE" in spe_raw else 0
        for_val = int(for_raw.split()[-1]) if "FOR" in for_raw else 0
        sta_desc = ROBOTIQ_STA_CODES.get(sta_val, "Unknown status")
        closed_pct = round((pos_val / 255.0) * 100.0, 1) if pos_val >= 0 else 0.0

        print(f"   [OK] Gripper responded!")
        print(f"   Gripper Status:   '{sta_raw}' -> {sta_desc}")
        print(f"   Gripper Position: '{pos_raw}' -> {pos_val}/255 ({closed_pct}% closed; 0-3 = Fully Open, 230-255 = Fully Closed)")
        print(f"   Last Gripper Cmd: {describe_gripper_settings(spe_val, for_val)}")
        print(f"   Next Script Cmd:  {describe_gripper_settings(ROBOTIQ_SPEED, ROBOTIQ_FORCE)}")
        sock.close()
    except Exception as e:
        print(f"   [FAIL] Gripper query failed: {e}")

    return ready_for_motion


class RobotiqGripper:
    def __init__(self, ip: str, port: int = 63352):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(2.0)
        self.sock.connect((ip, port))
        self.activate()

    def _set_var(self, var: str, val: int) -> bool:
        cmd = f"SET {var} {val}\n"
        self.sock.sendall(cmd.encode("utf-8"))
        data = self.sock.recv(1024).decode("utf-8").strip()
        return "ack" in data

    def _get_var(self, var: str) -> int:
        cmd = f"GET {var}\n"
        self.sock.sendall(cmd.encode("utf-8"))
        data = self.sock.recv(1024).decode("utf-8").strip()
        parts = data.split()
        if len(parts) >= 2 and parts[0] == var:
            return int(parts[1])
        raise RuntimeError(f"Unexpected response for GET {var}: {data}")

    def activate(self):
        sta = self._get_var("STA")
        if sta != 3:
            print("Activating gripper...")
            self._set_var("ACT", 0)
            time.sleep(0.1)
            self._set_var("ACT", 1)
            t_start = time.time()
            while time.time() - t_start < 5.0:
                if self._get_var("STA") == 3:
                    break
                time.sleep(0.1)
        self._set_var("GTO", 1)
        self._set_var("SPE", ROBOTIQ_SPEED)
        self._set_var("FOR", ROBOTIQ_FORCE)

    def emergency_release(self):
        """Immediately stops the gripper motor and commands fingers fully open."""
        self._set_var("GTO", 0)
        self._set_var("GTO", 1)
        self._set_var("SPE", 255)
        self._set_var("FOR", 0)
        self._set_var("POS", 0)

    def move_and_wait(
        self,
        pos: int,
        speed: int = ROBOTIQ_SPEED,
        force: int = ROBOTIQ_FORCE,
        timeout: float = 6.0,
        rtde_r: RTDEReceiveInterface = None,
    ):
        pos = max(0, min(255, int(pos)))
        speed = max(0, min(255, int(speed)))
        force = max(0, min(255, int(force)))

        self._set_var("SPE", speed)
        self._set_var("FOR", force)
        self._set_var("POS", pos)
        time.sleep(0.05)

        obj_descriptions = {
            1: "Stopped early due to outer contact while opening",
            2: "Stopped early due to inner contact (object grasped)",
            3: "Arrived at requested target position",
        }

        t_start = time.time()
        while time.time() - t_start < timeout:
            # Software E-Stop interlock: abort and open gripper if UR5 E-Stop or Protective Stop triggers
            if rtde_r is not None:
                if rtde_r.getRobotMode() != 7 or rtde_r.getSafetyMode() not in (1, 2):
                    print("   [SAFETY ABORT] UR5 E-Stop or Protective Stop detected! Releasing gripper immediately...")
                    self.emergency_release()
                    raise RuntimeError("Aborted gripper motion due to UR5 safety stop.")

            obj = self._get_var("OBJ")
            if obj in (1, 2, 3):
                final_pos = self._get_var("POS")
                print(f"   -> Gripper finished at POS={final_pos}/255 ({obj_descriptions[obj]})")
                break
            time.sleep(0.05)

    def close(self):
        self.sock.close()


def main():
    print(f"\n5. Connecting to UR5 arm and Robotiq gripper at {ROBOT_IP} for motion...")
    
    # 1. Connect interfaces
    rtde_c = RTDEControlInterface(ROBOT_IP)
    rtde_r = RTDEReceiveInterface(ROBOT_IP)
    rtde_io = RTDEIOInterface(ROBOT_IP)
    gripper = RobotiqGripper(ROBOT_IP, ROBOTIQ_PORT)
    print("Connected successfully.")

    try:
        # Lock global UR5 speed slider
        rtde_io.setSpeedSlider(UR5_SPEED_SLIDER)
        print(f"Global robot speed slider set to {int(UR5_SPEED_SLIDER * 100)}%.")

        # 2. Move arm to base ready position
        print(f"Current joints: {[round(x, 3) for x in rtde_r.getActualQ()]}")
        print(f"Target joints:  {[round(x, 3) for x in TARGET_BASE_JOINTS]}")
        print(f"Moving UR5 to base position (speed={UR5_MOVEJ_SPEED} rad/s, accel={UR5_MOVEJ_ACCEL} rad/s^2)...")
        rtde_c.moveJ(TARGET_BASE_JOINTS, UR5_MOVEJ_SPEED, UR5_MOVEJ_ACCEL)

        # 3. Close the gripper using top-level ROBOTIQ_SPEED and ROBOTIQ_FORCE
        print(f"Closing gripper (target POS=255/255) with {describe_gripper_settings(ROBOTIQ_SPEED, ROBOTIQ_FORCE)}...")
        gripper.move_and_wait(pos=255, speed=ROBOTIQ_SPEED, force=ROBOTIQ_FORCE, rtde_r=rtde_r)
        time.sleep(0.5)

        # 4. Open the gripper using top-level ROBOTIQ_SPEED and ROBOTIQ_FORCE
        print(f"Opening gripper (target POS=0/255) with {describe_gripper_settings(ROBOTIQ_SPEED, ROBOTIQ_FORCE)}...")
        gripper.move_and_wait(pos=0, speed=ROBOTIQ_SPEED, force=ROBOTIQ_FORCE, rtde_r=rtde_r)
        time.sleep(0.5)

    finally:
        # 5. Clean teardown
        print("Shutting down connections...")
        rtde_c.stopScript()
        gripper.close()
        print("Done.")

if __name__ == "__main__":
    if not check_ping(ROBOT_IP):
        sys.exit(1)
    if not check_ports(ROBOT_IP):
        sys.exit(1)
    if not check_state_read(ROBOT_IP):
        print("\n[ABORT] Robot is not in Mode 7 (RUNNING) or has a Safety Stop active.")
        print("        On the Teach Pendant, go to 'Initialize Robot' and press ON then START,")
        print("        or clear any Protective/Emergency Stop popup before running motion.")
        sys.exit(1)
    main()