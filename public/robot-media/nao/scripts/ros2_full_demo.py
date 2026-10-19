#!/usr/bin/env python3
"""ROS 2 Full Demo - No Walking
A long demonstration of NAO controlled via ROS 2 bridge.
Includes: speech, arm movements, head movements, hand control,
joint monitoring, and coordinated routines.

Run inside Docker: python3 ros2_full_demo.py
Make sure the bridge is running in another terminal first.
Make sure NAO is woken up via SSH before running.
"""
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from geometry_msgs.msg import Twist
from naoqi_bridge_msgs.msg import JointAnglesWithSpeed
from sensor_msgs.msg import JointState
import time
import math


class NaoROS2FullDemo(Node):
    def __init__(self):
        super().__init__('nao_ros2_full_demo')

        # Publishers
        self.speech_pub = self.create_publisher(String, '/speech', 10)
        self.joint_pub = self.create_publisher(JointAnglesWithSpeed, '/joint_angles', 10)

        # Check connection
        self.connected = False
        self.joint_sub = self.create_subscription(
            JointState, '/joint_states', self.joint_cb, 10
        )

        self.get_logger().info('Waiting for bridge connection...')
        time.sleep(3)

        if self.connected:
            self.get_logger().info('Connected! Starting demo...')
            self.run_full_demo()
        else:
            self.get_logger().error(
                'No data from bridge. Make sure:\n'
                '  1. Bridge is running in Terminal 1\n'
                '  2. NAO is powered on and reachable\n'
                '  3. NAO has been woken up via SSH'
            )

    def joint_cb(self, msg):
        if not self.connected:
            self.connected = True
            self.get_logger().info('Receiving data from {} joints').format(len(msg.name))

    def speak(self, text, wait=3.0):
        msg = String()
        msg.data = text
        self.speech_pub.publish(msg)
        self.get_logger().info(f'[SPEECH] {text}')
        time.sleep(wait)

    def move(self, names, angles, speed=0.2, wait=2.0):
        msg = JointAnglesWithSpeed()
        msg.joint_names = names
        msg.joint_angles = [float(a) for a in angles]
        msg.speed = float(speed)
        self.joint_pub.publish(msg)
        joints_str = ', '.join([f'{n}={a:.1f}' for n, a in zip(names, angles)])
        self.get_logger().info(f'[MOVE] {joints_str}')
        time.sleep(wait)

    def run_full_demo(self):
        # ==============================================
        # ACT 1: INTRODUCTION
        # ==============================================
        self.get_logger().info('=== ACT 1: Introduction ===')

        self.speak("Hello! Welcome to my ROS 2 demo!", 3.0)
        self.speak(
            "I am NAO, and I am being controlled through a ROS 2 bridge "
            "running inside a Docker container on an Ubuntu laptop.", 5.0
        )
        self.speak("Let me show you what I can do!", 2.0)

        # ==============================================
        # ACT 2: ARM MOVEMENTS
        # ==============================================
        self.get_logger().info('=== ACT 2: Arm Movements ===')

        self.speak("First, my arms.", 1.5)

        # Right arm up
        self.speak("Right arm up!", 1.0)
        self.move(['RShoulderPitch'], [0.0], 0.2, 2.0)

        # Left arm up
        self.speak("Left arm up!", 1.0)
        self.move(['LShoulderPitch'], [0.0], 0.2, 2.0)

        # Both arms out
        self.speak("Arms out to the sides!", 1.0)
        self.move(
            ['RShoulderRoll', 'LShoulderRoll'],
            [-1.2, 1.2], 0.2, 2.0
        )

        # Arms back in
        self.move(
            ['RShoulderRoll', 'LShoulderRoll'],
            [-0.3, 0.3], 0.2, 1.5
        )

        # Elbows bend
        self.speak("Bending my elbows!", 1.0)
        self.move(
            ['RElbowRoll', 'LElbowRoll'],
            [1.5, -1.5], 0.3, 1.5
        )
        self.move(
            ['RElbowRoll', 'LElbowRoll'],
            [0.5, -0.5], 0.3, 1.5
        )

        # Arms down
        self.speak("Arms down.", 1.0)
        self.move(
            ['RShoulderPitch', 'LShoulderPitch'],
            [1.5, 1.5], 0.2, 2.0
        )

        # ==============================================
        # ACT 3: WAVING
        # ==============================================
        self.get_logger().info('=== ACT 3: Waving ===')

        self.speak("Now let me wave to you!", 1.5)

        # Position arm for wave
        self.move(
            ['RShoulderPitch', 'RShoulderRoll', 'RElbowRoll'],
            [0.0, -0.3, 1.0], 0.3, 1.5
        )

        # Wave
        for i in range(4):
            self.move(['RElbowYaw', 'RWristYaw'], [1.5, 1.0], 0.5, 0.4)
            self.move(['RElbowYaw', 'RWristYaw'], [0.5, -1.0], 0.5, 0.4)

        # Arm back down
        self.move(
            ['RShoulderPitch', 'RShoulderRoll', 'RElbowRoll', 'RElbowYaw', 'RWristYaw'],
            [1.5, -0.3, 0.5, 1.2, 0.0], 0.2, 2.0
        )

        # ==============================================
        # ACT 4: HEAD MOVEMENTS
        # ==============================================
        self.get_logger().info('=== ACT 4: Head Movements ===')

        self.speak("Now watch my head!", 1.5)

        # Look left
        self.speak("Looking left.", 0.5)
        self.move(['HeadYaw'], [0.8], 0.2, 1.5)

        # Look right
        self.speak("Looking right.", 0.5)
        self.move(['HeadYaw'], [-0.8], 0.2, 1.5)

        # Center
        self.move(['HeadYaw'], [0.0], 0.2, 1.0)

        # Look up
        self.speak("Looking up.", 0.5)
        self.move(['HeadPitch'], [-0.4], 0.2, 1.5)

        # Look down
        self.speak("Looking down.", 0.5)
        self.move(['HeadPitch'], [0.4], 0.2, 1.5)

        # Center
        self.move(['HeadPitch'], [0.0], 0.2, 1.0)

        # Shake no
        self.speak("Shaking my head no.", 1.0)
        for i in range(3):
            self.move(['HeadYaw'], [0.5], 0.5, 0.3)
            self.move(['HeadYaw'], [-0.5], 0.5, 0.3)
        self.move(['HeadYaw'], [0.0], 0.3, 0.5)

        # Nod yes
        self.speak("Nodding yes!", 1.0)
        for i in range(3):
            self.move(['HeadPitch'], [0.3], 0.5, 0.3)
            self.move(['HeadPitch'], [-0.1], 0.5, 0.3)
        self.move(['HeadPitch'], [0.0], 0.3, 0.5)

        # ==============================================
        # ACT 5: COORDINATED MOVEMENTS
        # ==============================================
        self.get_logger().info('=== ACT 5: Coordinated Movements ===')

        self.speak("Watch me do some coordinated moves!", 2.0)

        # Mirror arms - both go up and down together
        self.speak("Mirror arms!", 1.0)
        for i in range(3):
            self.move(
                ['RShoulderPitch', 'LShoulderPitch'],
                [0.0, 0.0], 0.3, 1.0
            )
            self.move(
                ['RShoulderPitch', 'LShoulderPitch'],
                [1.5, 1.5], 0.3, 1.0
            )

        # Alternating arms
        self.speak("Alternating arms!", 1.0)
        for i in range(4):
            self.move(
                ['RShoulderPitch', 'LShoulderPitch'],
                [0.0, 1.5], 0.4, 0.7
            )
            self.move(
                ['RShoulderPitch', 'LShoulderPitch'],
                [1.5, 0.0], 0.4, 0.7
            )
        self.move(
            ['RShoulderPitch', 'LShoulderPitch'],
            [1.5, 1.5], 0.3, 1.0
        )

        # Arms and head together
        self.speak("Arms and head together!", 1.0)
        self.move(
            ['RShoulderPitch', 'LShoulderPitch', 'HeadYaw'],
            [0.0, 1.5, 0.5], 0.3, 1.0
        )
        self.move(
            ['RShoulderPitch', 'LShoulderPitch', 'HeadYaw'],
            [1.5, 0.0, -0.5], 0.3, 1.0
        )
        self.move(
            ['RShoulderPitch', 'LShoulderPitch', 'HeadYaw'],
            [0.0, 0.0, 0.0], 0.3, 1.0
        )

        # ==============================================
        # ACT 6: ROBOT DANCE (NO WALKING)
        # ==============================================
        self.get_logger().info('=== ACT 6: Dance ===')

        self.speak("Time to dance!", 1.5)

        # Arm pump dance
        for i in range(6):
            self.move(
                ['RShoulderPitch', 'LShoulderPitch', 'RElbowRoll', 'LElbowRoll', 'HeadYaw'],
                [-0.5, 1.0, 1.5, -0.5, 0.5], 0.5, 0.4
            )
            self.move(
                ['RShoulderPitch', 'LShoulderPitch', 'RElbowRoll', 'LElbowRoll', 'HeadYaw'],
                [1.0, -0.5, 0.5, -1.5, -0.5], 0.5, 0.4
            )

        # Disco points
        self.speak("Disco!", 0.5)
        for i in range(4):
            # Point right up
            self.move(
                ['RShoulderPitch', 'RShoulderRoll', 'RElbowRoll', 'HeadYaw'],
                [-0.5, -0.5, 0.3, -0.5], 0.5, 0.5
            )
            # Point left up
            self.move(
                ['RShoulderPitch', 'LShoulderPitch', 'LShoulderRoll', 'LElbowRoll', 'HeadYaw'],
                [1.5, -0.5, 0.5, -0.3, 0.5], 0.5, 0.5
            )

        # Reset
        self.move(
            ['RShoulderPitch', 'LShoulderPitch', 'RShoulderRoll', 'LShoulderRoll',
             'RElbowRoll', 'LElbowRoll', 'HeadYaw'],
            [1.5, 1.5, -0.3, 0.3, 0.5, -0.5, 0.0], 0.2, 2.0
        )

        # ==============================================
        # ACT 7: EXPRESSIVE MOVEMENTS
        # ==============================================
        self.get_logger().info('=== ACT 7: Expressions ===')

        # Surprised
        self.speak("Oh! I am surprised!", 1.0)
        self.move(
            ['RShoulderPitch', 'LShoulderPitch', 'RShoulderRoll', 'LShoulderRoll',
             'RElbowRoll', 'LElbowRoll', 'HeadPitch'],
            [0.5, 0.5, -0.8, 0.8, 1.0, -1.0, -0.3], 0.5, 2.0
        )
        self.move(
            ['RShoulderPitch', 'LShoulderPitch', 'RShoulderRoll', 'LShoulderRoll',
             'RElbowRoll', 'LElbowRoll', 'HeadPitch'],
            [1.5, 1.5, -0.3, 0.3, 0.5, -0.5, 0.0], 0.2, 2.0
        )

        # Thinking
        self.speak("Hmm, let me think about this.", 1.0)
        self.move(
            ['RShoulderPitch', 'RElbowRoll', 'RElbowYaw', 'HeadPitch', 'HeadYaw'],
            [0.3, 1.5, 0.5, 0.2, 0.3], 0.2, 3.0
        )
        self.move(
            ['RShoulderPitch', 'RElbowRoll', 'RElbowYaw', 'HeadPitch', 'HeadYaw'],
            [1.5, 0.5, 1.2, 0.0, 0.0], 0.2, 2.0
        )

        # Celebrating
        self.speak("Yay! I am celebrating!", 1.0)
        for i in range(3):
            self.move(
                ['RShoulderPitch', 'LShoulderPitch', 'RElbowRoll', 'LElbowRoll'],
                [0.0, 0.0, 1.5, -1.5], 0.5, 0.5
            )
            self.move(
                ['RShoulderPitch', 'LShoulderPitch', 'RElbowRoll', 'LElbowRoll'],
                [0.5, 0.5, 0.5, -0.5], 0.5, 0.5
            )
        self.move(
            ['RShoulderPitch', 'LShoulderPitch'],
            [1.5, 1.5], 0.2, 1.5
        )

        # ==============================================
        # ACT 8: COUNTING
        # ==============================================
        self.get_logger().info('=== ACT 8: Counting ===')

        self.speak("I can count with my arms!", 2.0)

        # One - right arm up
        self.speak("One!", 0.5)
        self.move(['RShoulderPitch'], [0.0], 0.3, 1.5)

        # Two - both arms up
        self.speak("Two!", 0.5)
        self.move(['LShoulderPitch'], [0.0], 0.3, 1.5)

        # Three - add head up
        self.speak("Three!", 0.5)
        self.move(['HeadPitch'], [-0.4], 0.3, 1.5)

        # Four - spread arms
        self.speak("Four!", 0.5)
        self.move(
            ['RShoulderRoll', 'LShoulderRoll'],
            [-1.0, 1.0], 0.3, 1.5
        )

        # Five - bend elbows
        self.speak("Five!", 0.5)
        self.move(
            ['RElbowRoll', 'LElbowRoll'],
            [1.5, -1.5], 0.3, 1.5
        )

        # Reset
        self.speak("And reset!", 1.0)
        self.move(
            ['RShoulderPitch', 'LShoulderPitch', 'RShoulderRoll', 'LShoulderRoll',
             'RElbowRoll', 'LElbowRoll', 'HeadPitch'],
            [1.5, 1.5, -0.3, 0.3, 0.5, -0.5, 0.0], 0.2, 2.0
        )

        # ==============================================
        # ACT 9: SMOOTH MOTION DEMO
        # ==============================================
        self.get_logger().info('=== ACT 9: Smooth Motion ===')

        self.speak("Watch how smoothly I can move.", 2.0)

        # Slow smooth head scan
        self.move(['HeadYaw'], [0.8], 0.05, 3.0)
        self.move(['HeadYaw'], [-0.8], 0.05, 3.0)
        self.move(['HeadYaw'], [0.0], 0.05, 2.0)

        # Slow arm raise
        self.speak("Slow and graceful.", 1.0)
        self.move(
            ['RShoulderPitch', 'LShoulderPitch'],
            [0.0, 0.0], 0.05, 4.0
        )
        self.move(
            ['RShoulderRoll', 'LShoulderRoll'],
            [-0.8, 0.8], 0.05, 3.0
        )
        self.move(
            ['RShoulderRoll', 'LShoulderRoll', 'RShoulderPitch', 'LShoulderPitch'],
            [-0.3, 0.3, 1.5, 1.5], 0.05, 4.0
        )

        # ==============================================
        # ACT 10: GOODBYE
        # ==============================================
        self.get_logger().info('=== ACT 10: Goodbye ===')

        self.speak(
            "That was my full ROS 2 demo! "
            "Everything you saw was controlled through ROS 2 topics "
            "published from a Docker container.", 6.0
        )

        # Final wave
        self.move(
            ['RShoulderPitch', 'RShoulderRoll', 'RElbowRoll'],
            [0.0, -0.3, 1.0], 0.3, 1.0
        )
        for i in range(3):
            self.move(['RElbowYaw'], [1.5], 0.5, 0.3)
            self.move(['RElbowYaw'], [0.5], 0.5, 0.3)

        self.move(
            ['RShoulderPitch', 'RElbowRoll', 'RElbowYaw'],
            [1.5, 0.5, 1.2], 0.2, 1.5
        )

        self.speak("Thank you for watching! Goodbye from ROS 2!", 3.0)
        self.get_logger().info('Demo complete!')


def main():
    rclpy.init()
    node = NaoROS2FullDemo()
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
