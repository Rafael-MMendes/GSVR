with open('deploy_ssh.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(50, len(lines)):
    print(f"{i+1:3d}: {lines[i].rstrip()}")

