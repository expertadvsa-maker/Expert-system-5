import os
import re

print("--- Searching for Firestore collections in src/ ---")
all_files = []
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            all_files.append(os.path.join(root, file))

collections = set()

for filepath in all_files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # check for collection(db, "collectionName")
        for match in re.finditer(r'collection\s*\(\s*\w+\s*,\s*[\'"]([^\'"]+)[\'"]\s*\)', content):
            collections.add(match.group(1))
            
        # check for doc(db, "collectionName", ...)
        for match in re.finditer(r'doc\s*\(\s*\w+\s*,\s*[\'"]([^\'"]+)[\'"]', content):
            collections.add(match.group(1))
            
    except Exception as e:
        pass

print("Firestore Collections found:")
for col in sorted(list(collections)):
    print(f"  - {col}")
