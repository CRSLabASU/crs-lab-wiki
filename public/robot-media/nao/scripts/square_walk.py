"""
NAO Square Walk with Speech
Usage: python walk.py --ip <NAO_IP>
"""

import argparse
import time
import math
from naoqi import ALProxy


def say(tts, msg, pause=0.5):
    print("[NAO]: " + msg)
    tts.say(msg)
    time.sleep(pause)


def run(ip, port=9559, side=1.0):
    motion = ALProxy("ALMotion", ip, port)
    posture = ALProxy("ALRobotPosture", ip, port)
    tts = ALProxy("ALTextToSpeech", ip, port)

    motion.wakeUp()
    posture.goToPosture("StandInit", 0.5)
    time.sleep(1.0)

    corners = [
        ("first", "north"),
        ("second", "east"),
        ("third", "south"),
        ("fourth", "west"),
    ]

    msg = ("Hello! I will walk in a square. "
           "Each side is " + str(side) + " meters.")
    say(tts, msg)

    for i, (ordinal, direction) in enumerate(corners):
        num = i + 1

        msg = ("Walking side " + str(num) + ". "
               "Heading " + direction + ".")
        say(tts, msg)

        motion.moveTo(side, 0, 0)
        time.sleep(0.3)

        if num < 4:
            msg = ("Reached the " + ordinal +
                   " corner. Turning left.")
            say(tts, msg)
            motion.moveTo(0, 0, math.pi / 2)
            time.sleep(0.3)
        else:
            say(tts, "Square complete! Back at start.")

    say(tts, "Going to rest now.")
    posture.goToPosture("Crouch", 0.5)
    motion.rest()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--ip", required=True)
    p.add_argument("--port", type=int, default=9559)
    p.add_argument("--side", type=float, default=1.0)
    args = p.parse_args()

    try:
        run(args.ip, args.port, args.side)
    except Exception as e:
        print("Error: " + str(e))
