#!/usr/bin/env python3
"""Final batch fix for remaining store file patterns."""
import re, os

os.chdir("/Users/isaaceliape/repos/e3cnc")

def fix_file(fp):
    with open(fp) as f:
        content = f.read()
    original = content
    
    # --- Mutations: add :any to payload params ---
    # Pattern: `state: SOMETHING, payload) {` → `state: SOMETHING, payload: any) {`
    content = re.sub(
        r'(state\s*:\s*\w+)\s*,\s*payload\s*\)(\s*\{)',
        r'\1, payload: any)\2',
        content
    )
    # Also `state: SOMETHING, data) {` → `state: SOMETHING, data: any) {`
    content = re.sub(
        r'(state\s*:\s*\w+)\s*,\s*data\s*\)(\s*\{)',
        r'\1, data: any)\2',
        content
    )
    
    # --- Getters: add :any to getters and rootGetters params ---
    # Simpler: replace `getters)` or `getters,` with `getters: any)` or `getters: any,`
    # Only inside arrow function params after state: TYPE
    content = re.sub(
        r'(state\s*:\s*\w+\s*,\s*)getters\b(?!\s*:)',
        r'\1getters: any',
        content
    )
    content = re.sub(
        r'(,\s*getters\s*,\s*)rootGetters\b(?!\s*:)',
        r'\1rootGetters: any',
        content
    )
    content = re.sub(
        r'(,\s*getters\s*,\s*rootState[^,]*,\s*)rootGetters\b(?!\s*:)',
        r'\1rootGetters: any',
        content
    )
    
    # --- Actions: fix remaining second params ---
    # After `: ActionContext<..., payload)` → `: ActionContext<..., payload: any)`
    content = re.sub(
        r'(ActionContext<[^>]+>\s*,\s*)(payload|data|name)\s*\)',
        r'\1\2: any)',
        content
    )
    
    # Handle multi-line: payload on next line
    content = re.sub(
        r'(ActionContext<[^>]+>),\s*\n\s+(payload|data|name)\)',
        r'\1,\n        \2: any)',
        content
    )
    
    if content != original:
        with open(fp, "w") as f:
            f.write(content)
        return True
    return False

store_dir = "src/store"
skip = {"src/store/gui/actions.ts"}
fixed = 0
for root, dirs, files in os.walk(store_dir):
    for f in files:
        if not f.endswith(".ts"):
            continue
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, ".")
        if rel in skip:
            continue
        if fix_file(fp):
            fixed += 1
            print(f"  FIXED {rel}")

print(f"\nFixed {fixed} files")
