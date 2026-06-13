import os
import re

print("--- Searching for Dashboard features in src/components/Dashboard.tsx ---")

filepath = 'src/components/Dashboard.tsx'
if not os.path.exists(filepath):
    print("Dashboard.tsx not found!")
    exit(1)

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find state declarations to see what data it handles
states = re.findall(r'const\s+\[([^,\]]+),\s*set[^\]]+\]\s*=\s*useState', content)
print("\nDashboard State variables:")
for state in sorted(list(set(states))):
    print(f"  - {state}")

# Let's find section headers or key JSX components
headers = re.findall(r'<h[1-4][^>]*>(.*?)</h[1-4]>', content)
print("\nHeaders / Title tags found in Dashboard.tsx:")
for h in set(headers):
    # strip HTML or braces
    clean_h = re.sub(r'<[^>]+>|\{|\}', '', h).strip()
    if clean_h:
        print(f"  - {clean_h}")

# Let's search for buttons or action elements
actions = re.findall(r'onClick\s*=\s*\{([^}]+)\}', content)
print(f"\nNumber of onClick actions in Dashboard: {len(actions)}")
