import sys
import re

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex for tags, ignoring self-closing tags and those inside strings
    # This is a bit naive but can catch obvious mismatches
    tags = re.findall(r'<(/?[a-z1-6]+|/?[A-Z][a-zA-Z0-9]*)', content)
    
    stack = []
    for tag in tags:
        if tag.startswith('/'):
            if not stack:
                print(f"Extra closing tag: {tag}")
                return False
            opening = stack.pop()
            if tag[1:] != opening:
                print(f"Mismatch: {opening} with {tag}")
                return False
        else:
            # Skip self-closing tags (simplified)
            # This logic needs to know which tags are self-closing or if they end with />
            # For simplicity, we just look at the whole tag string in the content
            pass

    # A better way is to look for the full tag
    tag_matches = re.finditer(r'<(/?[a-zA-Z0-9]+)(\s+[^>]*)?(/?)>', content)
    stack = []
    for match in tag_matches:
        full_tag = match.group(0)
        name = match.group(1)
        self_closing = match.group(3) == '/'
        
        if name in ['br', 'hr', 'img', 'input', 'link', 'meta']: # common self-closing
            continue
            
        if self_closing:
            continue
            
        if name.startswith('/'):
            if not stack:
                print(f"Extra closing tag: {full_tag} at index {match.start()}")
                return False
            opening = stack.pop()
            if name[1:] != opening:
                print(f"Mismatch: <{opening}> with {full_tag} at index {match.start()}")
                return False
        else:
            stack.append(name)
            
    if stack:
        print(f"Unclosed tags: {stack}")
        return False
        
    print("Tags look balanced!")
    return True

if __name__ == '__main__':
    check_tags(sys.argv[1])
