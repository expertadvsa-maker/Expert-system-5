import os
import re

filepath = 'src/components/Dashboard.tsx'
if not os.path.exists(filepath):
    print("Dashboard.tsx not found!")
    exit(1)

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's extract lines that contain JSX/HTML elements with Arabic text (e.g. labels, titles)
arabic_lines = []
for i, line in enumerate(content.split('\n')):
    # check if line contains Arabic characters
    if re.search(r'[\u0600-\u06FF]', line):
        clean = line.strip().encode('ascii', errors='ignore').decode('ascii')
        # We can print the line index and the Arabic text. To avoid print encoding errors, we write them to a UTF-8 file!
        arabic_lines.append(f"Line {i+1}: {line.strip()}")

# Write the output in UTF-8 to a scratch file so we can view it safely
output_path = 'scratch/dashboard_arabic_lines.txt'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(arabic_lines))

print(f"Extraction complete! Written to {output_path}. Read the file to see all sections.")
