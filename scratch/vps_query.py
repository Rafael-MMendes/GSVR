import paramiko
import sys

def execute_cmd(command):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('192.168.1.119', username='vps_9bpm', password='asdf1234')
        stdin, stdout, stderr = ssh.exec_command(command)
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        print("--- STDOUT ---")
        print(out)
        print("--- STDERR ---")
        print(err)
    except Exception as e:
        print("SSH Connection Error:", e)
    finally:
        ssh.close()

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'docker ps'
    execute_cmd(cmd)
