
import sys

def count_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    
    open_braces = 0
    close_braces = 0
    
    for line_num, line in enumerate(lines, 1):
        for char_num, char in enumerate(line, 1):
            if char == '{':
                stack.append((line_num, char_num))
                open_braces += 1
            elif char == '}':
                if stack:
                    stack.pop()
                    close_braces += 1
                else:
                    print(f"Extra closing brace at line {line_num}, col {char_num}")
                    close_braces += 1
                    
    print(f"Total Open: {open_braces}")
    print(f"Total Close: {close_braces}")
    
    if stack:
        print("Unclosed braces:")
        for line_num, char_num in stack:
            print(f"  Line {line_num}, col {char_num}")
    else:
        print("All braces are balanced.")

if __name__ == "__main__":
    count_braces('server.js')
