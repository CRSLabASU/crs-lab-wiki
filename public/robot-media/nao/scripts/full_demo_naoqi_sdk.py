#!/usr/bin/env python
"""NAOqi Full Demo - No Walking
A long demonstration of NAO's capabilities without any walking.
Includes: speech, arm movements, head movements, LED effects,
hand gestures, sensor interaction, and prebuilt behaviors.

Run on NAO: python full_demo_no_walk.py
"""
from naoqi import ALProxy
import time
import random

NAO_IP = "127.0.0.1"

# Connect to all modules
motion = ALProxy("ALMotion", NAO_IP, 9559)
posture = ALProxy("ALRobotPosture", NAO_IP, 9559)
tts = ALProxy("ALTextToSpeech", NAO_IP, 9559)
animated_speech = ALProxy("ALAnimatedSpeech", NAO_IP, 9559)
leds = ALProxy("ALLeds", NAO_IP, 9559)
memory = ALProxy("ALMemory", NAO_IP, 9559)
bm = ALProxy("ALBehaviorManager", NAO_IP, 9559)
sonar = ALProxy("ALSonar", NAO_IP, 9559)

def safe_behavior(name):
    """Run a behavior only if it exists"""
    if bm.isBehaviorInstalled(name):
        bm.runBehavior(name)
        return True
    return False

def safe_behavior_async(name):
    """Run a behavior non-blocking only if it exists"""
    if bm.isBehaviorInstalled(name):
        bm.post.runBehavior(name)
        return True
    return False

def flash_eyes(color, duration=0.5):
    """Flash eye LEDs a specific color (hex)"""
    leds.fadeRGB("FaceLeds", color, duration)

def reset_eyes():
    """Reset eyes to white"""
    leds.fadeRGB("FaceLeds", 0x00FFFFFF, 0.3)

# =====================================================
# ACT 1: INTRODUCTION
# =====================================================
motion.wakeUp()
posture.goToPosture("Stand", 0.5)
time.sleep(1)

flash_eyes(0x0000FF00)  # Green eyes

animated_speech.say(
    "^start(animations/Stand/Gestures/Hey_1) "
    "Hello everyone! My name is NAO. "
    "I am a humanoid robot made by Softbank Robotics."
)
time.sleep(1)

animated_speech.say(
    "^start(animations/Stand/Gestures/Everything_4) "
    "Today I am going to show you everything I can do. "
    "Let's get started!"
)
time.sleep(1)

# =====================================================
# ACT 2: ARM DEMONSTRATIONS
# =====================================================
tts.say("First, let me show you my arms.")
time.sleep(0.5)

# Raise right arm
tts.say("This is my right arm going up.")
motion.angleInterpolation("RShoulderPitch", [0.0], [2.0], True)
time.sleep(1)

# Raise left arm
tts.say("And my left arm.")
motion.angleInterpolation("LShoulderPitch", [0.0], [2.0], True)
time.sleep(1)

# Both arms out to sides
tts.say("I can stretch them out to the sides.")
motion.angleInterpolation(
    ["RShoulderRoll", "LShoulderRoll"],
    [[-1.2], [1.2]],
    [[2.0], [2.0]], True
)
time.sleep(1)

# Arms back to center
motion.angleInterpolation(
    ["RShoulderRoll", "LShoulderRoll"],
    [[-0.3], [0.3]],
    [[1.5], [1.5]], True
)
time.sleep(0.5)

# Elbow bends
tts.say("Watch my elbows bend.")
motion.angleInterpolation(
    ["RElbowRoll", "LElbowRoll"],
    [[1.5], [-1.5]],
    [[1.5], [1.5]], True
)
time.sleep(1)

motion.angleInterpolation(
    ["RElbowRoll", "LElbowRoll"],
    [[0.5], [-0.5]],
    [[1.5], [1.5]], True
)
time.sleep(0.5)

# Arms down
motion.angleInterpolation(
    ["RShoulderPitch", "LShoulderPitch"],
    [[1.5], [1.5]],
    [[2.0], [2.0]], True
)
time.sleep(1)

# =====================================================
# ACT 3: WAVING
# =====================================================
flash_eyes(0x00FFFF00)  # Yellow eyes

tts.say("Now let me wave hello to you!")
time.sleep(0.5)

# Position right arm for wave
motion.angleInterpolation(
    ["RShoulderPitch", "RShoulderRoll", "RElbowRoll", "RElbowYaw"],
    [[0.0], [-0.3], [1.0], [1.0]],
    [[1.0], [1.0], [1.0], [1.0]], True
)

# Wave back and forth
for i in range(4):
    motion.angleInterpolation(
        ["RElbowYaw", "RWristYaw"],
        [[1.5], [1.0]],
        [[0.3], [0.3]], True
    )
    motion.angleInterpolation(
        ["RElbowYaw", "RWristYaw"],
        [[0.5], [-1.0]],
        [[0.3], [0.3]], True
    )

# Arm back down
motion.angleInterpolation(
    ["RShoulderPitch", "RShoulderRoll", "RElbowRoll", "RElbowYaw", "RWristYaw"],
    [[1.5], [-0.3], [0.5], [1.2], [0.0]],
    [[1.5], [1.5], [1.5], [1.5], [1.5]], True
)
time.sleep(1)

# =====================================================
# ACT 4: HEAD MOVEMENTS
# =====================================================
flash_eyes(0x000000FF)  # Blue eyes

tts.say("Let me show you how my head moves.")
time.sleep(0.5)

# Look left
tts.say("I can look left.")
motion.angleInterpolation("HeadYaw", [0.8], [1.5], True)
time.sleep(0.5)

# Look right
tts.say("And right.")
motion.angleInterpolation("HeadYaw", [-0.8], [1.5], True)
time.sleep(0.5)

# Center
motion.angleInterpolation("HeadYaw", [0.0], [1.0], True)
time.sleep(0.3)

# Look up
tts.say("I can look up.")
motion.angleInterpolation("HeadPitch", [-0.4], [1.5], True)
time.sleep(0.5)

# Look down
tts.say("And down.")
motion.angleInterpolation("HeadPitch", [0.4], [1.5], True)
time.sleep(0.5)

# Center
motion.angleInterpolation("HeadPitch", [0.0], [1.0], True)
time.sleep(0.3)

# Shake head no
tts.say("I can shake my head no.")
motion.angleInterpolation(
    "HeadYaw",
    [0.5, -0.5, 0.5, -0.5, 0.0],
    [0.4, 0.8, 1.2, 1.6, 2.0], True
)
time.sleep(1)

# Nod yes
tts.say("And nod yes!")
motion.angleInterpolation(
    "HeadPitch",
    [0.3, -0.1, 0.3, -0.1, 0.0],
    [0.4, 0.8, 1.2, 1.6, 2.0], True
)
time.sleep(1)

# =====================================================
# ACT 5: HAND CONTROL
# =====================================================
flash_eyes(0x00FF00FF)  # Purple eyes

tts.say("Did you know I can open and close my hands?")
time.sleep(0.5)

# Raise arms to show hands
motion.angleInterpolation(
    ["RShoulderPitch", "LShoulderPitch", "RElbowRoll", "LElbowRoll"],
    [[0.5], [0.5], [1.0], [-1.0]],
    [[1.5], [1.5], [1.5], [1.5]], True
)
time.sleep(0.5)

# Open hands
tts.say("Open!")
motion.openHand("RHand")
motion.openHand("LHand")
time.sleep(1.5)

# Close hands
tts.say("Close!")
motion.closeHand("RHand")
motion.closeHand("LHand")
time.sleep(1.5)

# Open and close a few times
for i in range(3):
    motion.openHand("RHand")
    motion.openHand("LHand")
    time.sleep(0.5)
    motion.closeHand("RHand")
    motion.closeHand("LHand")
    time.sleep(0.5)

# Arms down
motion.angleInterpolation(
    ["RShoulderPitch", "LShoulderPitch"],
    [[1.5], [1.5]],
    [[1.5], [1.5]], True
)
time.sleep(1)

# =====================================================
# ACT 6: LED LIGHT SHOW
# =====================================================
tts.say("Now watch my eyes change colors!")
time.sleep(0.5)

colors = [
    (0x00FF0000, "Red"),
    (0x0000FF00, "Green"),
    (0x000000FF, "Blue"),
    (0x00FFFF00, "Yellow"),
    (0x00FF00FF, "Purple"),
    (0x0000FFFF, "Cyan"),
    (0x00FF8000, "Orange"),
    (0x00FFFFFF, "White"),
]

for color_hex, color_name in colors:
    leds.fadeRGB("FaceLeds", color_hex, 0.3)
    tts.say(color_name)
    time.sleep(0.5)

# Rainbow effect
tts.say("And here is my rainbow mode!")
leds.rasta(5.0)
time.sleep(5)
reset_eyes()
time.sleep(1)

# =====================================================
# ACT 7: EMOTIONS
# =====================================================
tts.say("I can also express emotions!")
time.sleep(0.5)

# Happy
flash_eyes(0x0000FF00)
tts.say("This is me being happy!")
safe_behavior("animations/Stand/Emotions/Positive/Happy_4")
posture.goToPosture("Stand", 0.5)
time.sleep(1)

# Excited
flash_eyes(0x00FFFF00)
tts.say("This is me being excited!")
safe_behavior("animations/Stand/Emotions/Positive/Hysterical_1")
posture.goToPosture("Stand", 0.5)
time.sleep(1)

# Sad
flash_eyes(0x000000FF)
tts.say("And this is me being sad.")
safe_behavior("animations/Stand/Emotions/Negative/Sad_1")
posture.goToPosture("Stand", 0.5)
time.sleep(1)

# Angry
flash_eyes(0x00FF0000)
tts.say("And angry!")
safe_behavior("animations/Stand/Emotions/Negative/Angry_1")
posture.goToPosture("Stand", 0.5)
time.sleep(1)

# Afraid
flash_eyes(0x00FF00FF)
tts.say("And scared!")
safe_behavior("animations/Stand/Emotions/Negative/Afraid_1")
posture.goToPosture("Stand", 0.5)
time.sleep(1)

reset_eyes()

# =====================================================
# ACT 8: GESTURES
# =====================================================
tts.say("I also know many gestures!")
time.sleep(0.5)

animated_speech.say(
    "^start(animations/Stand/Gestures/BowShort_1) "
    "I can bow."
)
time.sleep(1)

animated_speech.say(
    "^start(animations/Stand/Gestures/ShowSky_3) "
    "I can point to the sky."
)
time.sleep(1)

animated_speech.say(
    "^start(animations/Stand/Gestures/Enthusiastic_4) "
    "I can be enthusiastic!"
)
time.sleep(1)

animated_speech.say(
    "^start(animations/Stand/Gestures/Everything_4) "
    "I can show you everything!"
)
time.sleep(1)

animated_speech.say(
    "^start(animations/Stand/Gestures/Thinking_1) "
    "And I can think about things. Hmm."
)
time.sleep(1)

# =====================================================
# ACT 9: DANCE ROUTINE
# =====================================================
flash_eyes(0x00FF8000)  # Orange

tts.say("Now it is time to dance!")
time.sleep(0.5)

leds.post.rasta(8.0)

# Dance move 1: Arm pumps
names = [
    "RShoulderPitch", "LShoulderPitch",
    "RElbowRoll", "LElbowRoll",
    "HeadYaw",
]
times_d = [
    [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
    [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
    [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
    [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
    [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
]
keys_d = [
    [-0.5, 1.0, -0.5, 1.0, -0.5, 1.0, -0.5, 1.0],
    [1.0, -0.5, 1.0, -0.5, 1.0, -0.5, 1.0, 1.0],
    [1.5, 0.3, 1.5, 0.3, 1.5, 0.3, 1.5, 0.5],
    [-1.5, -0.3, -1.5, -0.3, -1.5, -0.3, -1.5, -0.5],
    [0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.0, 0.0],
]
motion.angleInterpolation(names, keys_d, times_d, True)
time.sleep(0.5)

# Dance move 2: Both arms up and sway
names2 = [
    "RShoulderPitch", "LShoulderPitch",
    "RShoulderRoll", "LShoulderRoll",
    "LHipRoll", "RHipRoll",
    "HeadYaw",
]
times2 = [
    [0.5, 1.5, 2.5, 3.5, 4.0],
    [0.5, 1.5, 2.5, 3.5, 4.0],
    [0.5, 1.5, 2.5, 3.5, 4.0],
    [0.5, 1.5, 2.5, 3.5, 4.0],
    [0.5, 1.5, 2.5, 3.5, 4.0],
    [0.5, 1.5, 2.5, 3.5, 4.0],
    [0.5, 1.5, 2.5, 3.5, 4.0],
]
keys2 = [
    [0.0, 0.0, 0.0, 0.0, 1.5],
    [0.0, 0.0, 0.0, 0.0, 1.5],
    [-0.5, -0.8, -0.5, -0.8, -0.3],
    [0.5, 0.8, 0.5, 0.8, 0.3],
    [0.1, -0.1, 0.1, -0.1, 0.0],
    [0.1, -0.1, 0.1, -0.1, 0.0],
    [0.3, -0.3, 0.3, -0.3, 0.0],
]
motion.angleInterpolation(names2, keys2, times2, True)
time.sleep(1)

# =====================================================
# ACT 10: SENSOR READINGS
# =====================================================
reset_eyes()
tts.say("Let me tell you about my sensors.")
time.sleep(0.5)

# Battery
try:
    battery = memory.getData("Device/SubDeviceList/Battery/Charge/Sensor/Value")
    tts.say("My battery is at %d percent." % int(battery * 100))
    time.sleep(0.5)
except:
    pass

# Head temperature
try:
    temp = memory.getData("Device/SubDeviceList/HeadYaw/Temperature/Sensor/Value")
    tts.say("My head motor temperature is %d degrees." % int(temp))
    time.sleep(0.5)
except:
    pass

# Sonar
try:
    sonar.subscribe("demo")
    time.sleep(0.5)
    left_s = memory.getData("Device/SubDeviceList/US/Left/Sensor/Value")
    right_s = memory.getData("Device/SubDeviceList/US/Right/Sensor/Value")
    tts.say("My left sonar detects something at %.1f meters." % left_s)
    tts.say("My right sonar detects something at %.1f meters." % right_s)
    sonar.unsubscribe("demo")
    time.sleep(0.5)
except:
    pass

# =====================================================
# ACT 11: HEAD TOUCH INTERACTION
# =====================================================
flash_eyes(0x0000FFFF)  # Cyan

animated_speech.say(
    "^start(animations/Stand/Gestures/ShowSky_3) "
    "Now it is your turn! Touch my head and I will react!"
)

reactions = [
    "That tickles!",
    "Oh! Hello there!",
    "Hee hee! That feels nice!",
    "Are you petting me? I like it!",
    "Oh! You surprised me!",
]

touches = 0
waited = 0
while waited < 20 and touches < 3:
    front = memory.getData("Device/SubDeviceList/Head/Touch/Front/Sensor/Value")
    middle = memory.getData("Device/SubDeviceList/Head/Touch/Middle/Sensor/Value")
    rear = memory.getData("Device/SubDeviceList/Head/Touch/Rear/Sensor/Value")

    if front > 0.5 or middle > 0.5 or rear > 0.5:
        touches += 1
        reaction = random.choice(reactions)
        flash_eyes(random.choice([0x00FF0000, 0x0000FF00, 0x000000FF, 0x00FF00FF]), 0.2)
        tts.say(reaction)
        time.sleep(1.5)

    time.sleep(0.2)
    waited += 0.2

if touches == 0:
    tts.say("Nobody touched me. That is okay!")
else:
    tts.say("That was fun! Thank you for the %d touches!" % touches)
time.sleep(1)

# =====================================================
# ACT 12: JOKES
# =====================================================
reset_eyes()

animated_speech.say(
    "^start(animations/Stand/Gestures/Thinking_1) "
    "Would you like to hear some jokes?"
)
time.sleep(1)

# Joke 1
animated_speech.say(
    "^start(animations/Stand/Gestures/ShowSky_3) "
    "Why do robots never get scared?"
)
time.sleep(1.5)
animated_speech.say(
    "^start(animations/Stand/Emotions/Positive/Happy_4) "
    "Because they have nerves of steel! Ha ha ha!"
)
time.sleep(2)

# Joke 2
animated_speech.say(
    "^start(animations/Stand/Gestures/Thinking_1) "
    "What is a robots favorite type of music?"
)
time.sleep(1.5)
animated_speech.say(
    "^start(animations/Stand/Gestures/Enthusiastic_4) "
    "Heavy metal! Get it?"
)
time.sleep(2)

# Joke 3
animated_speech.say(
    "^start(animations/Stand/Gestures/Everything_4) "
    "Why did the robot go on vacation?"
)
time.sleep(1.5)
animated_speech.say(
    "^start(animations/Stand/Emotions/Positive/Happy_4) "
    "To recharge its batteries!"
)
time.sleep(2)

# =====================================================
# ACT 13: POSTURES
# =====================================================
tts.say("Let me show you my different postures.")
time.sleep(0.5)

tts.say("This is my standing pose.")
posture.goToPosture("Stand", 0.5)
time.sleep(2)

tts.say("I can stand with my arms raised.")
posture.goToPosture("StandInit", 0.5)
time.sleep(2)

tts.say("I can crouch down.")
posture.goToPosture("Crouch", 0.5)
time.sleep(2)

tts.say("And stand back up!")
posture.goToPosture("Stand", 0.5)
time.sleep(2)

# =====================================================
# ACT 14: GRAND FINALE
# =====================================================
flash_eyes(0x00FF8000)

animated_speech.say(
    "^start(animations/Stand/Gestures/Enthusiastic_4) "
    "And now, for my grand finale!"
)
time.sleep(1)

# Final dance with rainbow eyes
leds.post.rasta(6.0)

names_finale = [
    "RShoulderPitch", "LShoulderPitch",
    "RShoulderRoll", "LShoulderRoll",
    "RElbowRoll", "LElbowRoll",
    "RElbowYaw", "LElbowYaw",
    "HeadYaw", "HeadPitch",
]
times_finale = [[0.4*i for i in range(1, 13)] for _ in range(10)]
keys_finale = [
    # Right shoulder pitch - pumping
    [-0.5, 0.5, -0.5, 0.5, 0.0, -1.0, 0.0, -1.0, 0.0, 0.5, -0.5, 1.5],
    # Left shoulder pitch - alternating
    [0.5, -0.5, 0.5, -0.5, -1.0, 0.0, -1.0, 0.0, 0.5, 0.0, -0.5, 1.5],
    # Right shoulder roll
    [-0.3, -0.8, -0.3, -0.8, -0.5, -0.5, -0.3, -0.8, -0.3, -0.5, -0.3, -0.3],
    # Left shoulder roll
    [0.3, 0.8, 0.3, 0.8, 0.5, 0.5, 0.3, 0.8, 0.3, 0.5, 0.3, 0.3],
    # Right elbow
    [1.5, 0.5, 1.5, 0.5, 1.0, 0.5, 1.5, 0.5, 1.0, 1.5, 0.5, 0.5],
    # Left elbow
    [-1.5, -0.5, -1.5, -0.5, -1.0, -0.5, -1.5, -0.5, -1.0, -1.5, -0.5, -0.5],
    # Right elbow yaw
    [1.5, 0.5, 1.5, 0.5, 1.0, 1.5, 0.5, 1.0, 1.5, 0.5, 1.0, 1.2],
    # Left elbow yaw
    [-1.5, -0.5, -1.5, -0.5, -1.0, -1.5, -0.5, -1.0, -1.5, -0.5, -1.0, -1.2],
    # Head yaw
    [0.5, -0.5, 0.5, -0.5, 0.7, -0.7, 0.5, -0.5, 0.3, -0.3, 0.0, 0.0],
    # Head pitch
    [0.0, 0.2, 0.0, -0.2, 0.0, 0.2, 0.0, -0.2, 0.0, 0.0, 0.0, 0.0],
]
motion.angleInterpolation(names_finale, keys_finale, times_finale, True)
time.sleep(1)

# =====================================================
# ACT 15: GOODBYE
# =====================================================
reset_eyes()
posture.goToPosture("Stand", 0.5)
time.sleep(1)

flash_eyes(0x0000FF00)

animated_speech.say(
    "^start(animations/Stand/Gestures/BowShort_1) "
    "Thank you so much for watching my demo! "
    "I hope you enjoyed it. "
    "I am NAO, and it was a pleasure performing for you. "
    "Goodbye!"
)
time.sleep(2)

# Sit down and rest
posture.goToPosture("Sit", 0.5)
time.sleep(1)
reset_eyes()
motion.rest()

print("Demo complete!")
