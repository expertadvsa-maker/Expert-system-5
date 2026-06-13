import os
import re

print("--- Searching for Aliphia usage in src/components/ ---")
components_dir = 'src/components'
files = [f for f in os.listdir(components_dir) if f.endswith(('.ts', '.tsx'))]

for file in files:
    path = os.path.join(components_dir, file)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if re.search(r'aliphia', content, re.IGNORECASE):
        print(f"\nFile: {file}")
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if re.search(r'aliphia', line, re.IGNORECASE):
                # clean line of non-ascii characters to prevent printing crashes
                clean_line = line.strip().encode('ascii', errors='ignore').decode('ascii')
                print(f"  Line {i+1}: {clean_line[:100]}")
