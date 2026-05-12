import subprocess
import sys

def run_ssh():
    cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', 'vps_9bpm@192.168.1.123', 'docker ps']
    try:
        # We try to pass password via stdin, though ssh often blocks this
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(input='asdf1234\n', timeout=10)
        print("STDOUT:", stdout)
        print("STDERR:", stderr)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    run_ssh()
