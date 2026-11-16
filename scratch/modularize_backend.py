import os
import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    server_lines = f.readlines()

def get_slice(start_line, end_line):
    # 1-indexed to 0-indexed
    return ''.join(server_lines[start_line - 1 : end_line])

os.makedirs('backend/controllers', exist_ok=True)
os.makedirs('backend/routes', exist_ok=True)

print("Directories verified.")

