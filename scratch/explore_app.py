import os
import re

print("--- Searching all source files in src/ ---")

all_files = []
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            all_files.append(os.path.join(root, file))

print(f"Found {len(all_files)} source files.")

axios_calls = []
api_endpoints = []
whatsapp_refs = []
aliphia_refs = []

for filepath in all_files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # check for axios or fetch calls
        for match in re.finditer(r'axios\.(get|post|put|delete)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]', content):
            axios_calls.append((filepath, match.group(0)))
            
        # check for endpoints
        for match in re.finditer(r'[\'"`](/(?:api|api_public|guest)/[^\'"`]*)[\'"`]', content):
            api_endpoints.append((filepath, match.group(1)))
            
        # check for whatsapp case insensitive
        if re.search(r'whatsapp', content, re.IGNORECASE):
            whatsapp_refs.append(filepath)
            
        # check for aliphia case insensitive
        if re.search(r'aliphia', content, re.IGNORECASE):
            aliphia_refs.append(filepath)
            
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

print(f"\n--- Found {len(axios_calls)} axios calls ---")
for f, call in list(set(axios_calls))[:10]:
    print(f"  {f}: {call}")

print(f"\n--- Found {len(api_endpoints)} API endpoints ---")
for f, ep in list(set(api_endpoints))[:20]:
    print(f"  {f}: {ep}")

print(f"\n--- WhatsApp references in files ({len(whatsapp_refs)}) ---")
for f in whatsapp_refs:
    print(f"  {f}")

print(f"\n--- Aliphia references in files ({len(aliphia_refs)}) ---")
for f in aliphia_refs:
    print(f"  {f}")
