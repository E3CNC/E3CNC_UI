#!/usr/bin/env python3
"""Fix remaining store files — handles mutation method syntax and edge cases."""

import re, os

os.chdir("/Users/isaaceliape/repos/e3cnc")

def fix_file(fp):
    """Fix mutation, getter, and action method-shorthand patterns."""
    with open(fp) as f:
        content = f.read()
    original = content
    
    # --- Extract state type ---
    m = re.search(r'export\s+const\s+mutations:\s*MutationTree<([^>]+)>', content)
    if m:
        st = m.group(1).strip()
        # Fix mutation method syntax: `mutationName(state,` → `mutationName(state: ST,`
        # Match: `(\s+\w+)\(state\b(?!\s*:)`  where the line starts with whitespace then a word then `(state`
        content = re.sub(r'(\s+\w+)\(\bstate\b(?!\s*:)', r'\1(state: ' + st, content)
        # Also handle data/payload without type in mutation method
        # Already fixed by GetterTree/MutationTree/ActionTree typing in most cases
    
    m = re.search(r'export\s+const\s+getters:\s*GetterTree<([^,]+),\s*([^>]+)>', content)
    if m:
        st = m.group(1).strip()
        rt = m.group(2).strip()
        # Fix getter arrow functions: `(state,` → `(state: ST,`
        content = re.sub(r'(:\s*)\(\bstate\b(?!\s*:)', r'\1(state: ' + st, content)
        # Fix rootState in getter params selectively
        # Only in function param context: after `getters` keyword typically
        content = re.sub(r'(,\s*getters[^)]*?)\brootState\b(?!\s*:)', r'\1rootState: ' + rt, content)
    
    m = re.search(r'export\s+const\s+actions:\s*ActionTree<([^,]+),\s*([^>]+)>', content)
    if m:
        st = m.group(1).strip()
        rt = m.group(2).strip()
        # Already mostly fixed. Handle remaining edge cases.
    
    if content != original:
        with open(fp, "w") as f:
            f.write(content)
        return True
    return False


store_dir = "src/store"
skip = {"src/store/gui/actions.ts", "src/store/variables.ts", "src/store/server/index.ts", 
        "src/store/gui/index.ts", "src/store/farm/index.ts", "src/store/gui/types.ts"}

fixed_count = 0
for root, dirs, files in os.walk(store_dir):
    for f in files:
        if not f.endswith(".ts"):
            continue
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, ".")
        if rel in skip:
            continue
        if fix_file(fp):
            fixed_count += 1
            print(f"  FIXED {rel}")

print(f"\nFixed {fixed_count} files")
