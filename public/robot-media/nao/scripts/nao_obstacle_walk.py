"""
NAO Obstacle Avoidance Walker
Usage: python obstacle.py --ip <NAO_IP>
"""

import argparse
import time
import math
from naoqi import ALProxy

SONAR_L = ("Device/SubDeviceList"
           "/US/Left/Sensor/Value")
SONAR_R = ("Device/SubDeviceList"
           "/US/Right/Sensor/Value")


def say(tts, msg, pause=0.3):
    print("[NAO]: " + msg)
    tts.say(msg)
    time.sleep(pause)


def run(ip, port=9559, thresh=0.4, dur=60):
    motion = ALProxy("ALMotion", ip, port)
    posture = ALProxy("ALRobotPosture", ip, port)
    tts = ALProxy("ALTextToSpeech", ip, port)
    sonar = ALProxy("ALSonar", ip, port)
    mem = ALProxy("ALMemory", ip, port)

    motion.wakeUp()
    posture.goToPosture("StandInit", 0.5)
    time.sleep(1.0)

    sonar.subscribe("ObstWalker")
    say(tts, "Starting obstacle avoidance walk.")
    time.sleep(0.5)

    start = time.time()
    motion.moveToward(0.6, 0, 0)

    try:
        while (time.time() - start) < dur:
            left = mem.getData(SONAR_L)
            right = mem.getData(SONAR_R)
            closest = min(left, right)

            if closest < thresh:
                # Stop
                motion.stopMove()
                time.sleep(0.3)
                say(tts, "Obstacle ahead!")

                # Back up
                say(tts, "Backing up.")
                motion.moveTo(-0.15, 0, 0)
                time.sleep(0.3)

                # Pick direction
                if left < right:
                    angle = -math.pi / 2
                    name = "right"
                else:
                    angle = math.pi / 2
                    name = "left"

                # Turn away
                say(tts, "Turning " + name + ".")
                motion.moveTo(0, 0, angle)
                time.sleep(0.3)

                # Walk past
                say(tts, "Walking past it.")
                motion.moveTo(0.5, 0, 0)
                time.sleep(0.3)

                # Turn back
                say(tts, "Turning back.")
                motion.moveTo(0, 0, -angle)
                time.sleep(0.3)

                # Clear it
                motion.moveTo(0.3, 0, 0)
                time.sleep(0.3)

                say(tts, "Obstacle cleared. Resuming.")
                motion.moveToward(0.6, 0, 0)

            time.sleep(0.3)

    except KeyboardInterrupt:
        print("\n[Interrupted]")

    finally:
        motion.stopMove()
        sonar.unsubscribe("ObstWalker")
        say(tts, "Walk finished. Resting.")
        posture.goToPosture("Crouch", 0.5)
        motion.rest()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--ip", required=True)
    p.add_argument("--port", type=int, default=9559)
    p.add_argument("--thresh", type=float, default=0.4)
    p.add_argument("--dur", type=int, default=60)
    args = p.parse_args()

    try:
        run(args.ip, args.port, args.thresh, args.dur)
    except Exception as e:
        print("Error: " + str(e))
