import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char in '{[(':
                stack.append((char, i + 1))
            elif char in '}])':
                if not stack:
                    print(f"Extra closing char '{char}' at line {i+1}")
                    return False
                opening, line_num = stack.pop()
                if (opening == '{' and char != '}') or \
                   (opening == '[' and char != ']') or \
                   (opening == '(' and char != ')'):
                    print(f"Mismatch: '{opening}' at line {line_num} with '{char}' at line {i+1}")
                    return False
    
    if stack:
        char, line_num = stack.pop()
        print(f"Unclosed '{char}' from line {line_num}")
        return False
    
    print("Balanced!")
    return True

if __name__ == '__main__':
    check_balance(sys.argv[1])
