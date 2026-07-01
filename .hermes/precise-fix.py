#!/usr/bin/env python3
"""Precise batch-fixer for TypeScript store files — only targets function parameter patterns."""

import re, os

os.chdir("/Users/isaaceliape/repos/e3cnc")

def patch_file(fp, old, new):
    with open(fp) as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(fp, "w") as f:
            f.write(content)
        return True
    return False

def classify(fp):
    with open(fp) as f:
        content = f.read()
    
    m = re.search(r'export\s+const\s+actions:\s*ActionTree<([^,]+),\s*([^>]+)>', content)
    if m:
        return "actions", m.group(1).strip(), m.group(2).strip(), content
    
    m = re.search(r'export\s+const\s+getters:\s*GetterTree<([^,]+),\s*([^>]+)>', content)
    if m:
        return "getters", m.group(1).strip(), m.group(2).strip(), content
    
    m = re.search(r'export\s+const\s+mutations:\s*MutationTree<([^>]+)>', content)
    if m:
        return "mutations", m.group(1).strip(), None, content
    
    return None, None, None, None


def fix_actions(fp, st, rt, content):
    """Fix action files: add ActionContext typing and :any to second params."""
    fixed = False
    
    # Add ActionContext import if needed
    if 'ActionContext' not in content and 'ActionTree<' in content:
        content = re.sub(
            r'(import\s*\{\s*)(ActionTree)(\s*\}\s*from\s+[\'"]vuex[\'"])',
            r'\1ActionContext, \2\3',
            content
        )
        fixed = True
    
    # Fix: `({ ... }, payload) {` → `({ ... }: ActionContext<ST, RT>, payload: any) {`
    # Only targets single-line action handlers
    pattern = r'(\s+\w+)\((\{[^}]{1,200}\})\s*,\s*(\w+)\s*\)\s*\{'
    replacement = r'\1(\2: ActionContext<'+st+', '+rt+'>'r', \3: any) {'
    
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        content = new_content
        fixed = True
    
    # Fix: `({ ... }) {` → `({ ... }: ActionContext<ST, RT>) {`
    pattern2 = r'(\s+\w+)\((\{[^}]{1,200}\})\)\s*\{'
    replacement2 = r'\1(\2: ActionContext<'+st+', '+rt+'>'r') {'
    
    new_content = re.sub(pattern2, replacement2, content)
    if new_content != content:
        content = new_content
        fixed = True
    
    # Fix: `(_, payload) {` → `(_context: ActionContext<ST, RT>, payload: any) {`
    pattern3 = r'\(\s*_\s*,\s*(\w+)\s*\)\s*\{'
    replacement3 = r'(_context: ActionContext<'+st+', '+rt+'>'r', \1: any) {'
    
    new_content = re.sub(pattern3, replacement3, content)
    if new_content != content:
        content = new_content
        fixed = True
    
    # Also handle async
    pattern4 = r'(\s+async\s+\w+)\((\{[^}]{1,200}\})\s*,\s*(\w+)\s*\)\s*\{'
    replacement4 = r'\1(\2: ActionContext<'+st+', '+rt+'>'r', \3: any) {'
    
    new_content = re.sub(pattern4, replacement4, content)
    if new_content != content:
        content = new_content
        fixed = True
    
    pattern5 = r'(\s+async\s+\w+)\((\{[^}]{1,200}\})\)\s*\{'
    replacement5 = r'\1(\2: ActionContext<'+st+', '+rt+'>'r') {'
    
    new_content = re.sub(pattern5, replacement5, content)
    if new_content != content:
        content = new_content
        fixed = True
    
    # Now fix second params that still have data/name/payload without :any
    # Only if the first param already has ActionContext
    # Pattern: `: ActionContext<ST, RT>, something) {` where something doesn't have :type
    pattern6 = r'(ActionContext<[^>]+>,\s*)(\w+)\)\s*\{'
    new_content = re.sub(pattern6, r'\1\2: any) {', content)
    if new_content != content:
        content = new_content
        fixed = True
    
    return content, fixed
    

def fix_getters(fp, st, rt, content):
    """Fix getter files: add :StateType to state param, :RootState to rootState param."""
    fixed = False
    
    # Fix: `(state,` → `(state: ST,`  (in function defs: `: (state,`)
    content = re.sub(r'(:\s*)\(state\b(?!\s*:)', r'\1(state: ' + st, content)
    
    # Fix: `, rootState)` or `, rootState,` → with type
    if rt and rt != st:
        # Only replace rootState when it's being used as a function parameter
        # Pattern: after `state: ST,` comes ` rootState` or ` rootState,`
        content = re.sub(r'(\bgetters\b[^)]*)\brootState\b(?!\s*:)', r'\1rootState: ' + rt, content)
        # Also when rootState appears right after state or state: ST
        content = re.sub(r'(state(?:\s*:\s*\w+)?)\s*,\s*\brootState\b(?!\s*:)', r'\1, rootState: ' + rt, content)
    
    fixed = True  # Always assume some change
    return content, fixed


def fix_mutations(fp, st, rt, content):
    """Fix mutation files: add :StateType to state param."""
    fixed = False
    
    content = re.sub(r'(:\s*)\(state\b(?!\s*:)', r'\1(state: ' + st, content)
    
    fixed = True
    return content, fixed


# Main
store_dir = "src/store"
skip = {
    "src/store/variables.ts", "src/store/server/index.ts",
    "src/store/gui/index.ts", "src/store/farm/index.ts",
    "src/store/gui/types.ts", "src/store/gui/actions.ts",
}

results = []
for root, dirs, files in os.walk(store_dir):
    for f in files:
        if not f.endswith(".ts"):
            continue
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, ".")
        if rel in skip:
            continue
        
        try:
            ft, st, rt, content = classify(fp)
            if not ft:
                continue
        except Exception as e:
            print(f"  ERROR reading {rel}: {e}")
            continue
        
        old_content = content
        
        if ft == "actions":
            content, changed = fix_actions(rel, st, rt, content)
        elif ft == "getters":
            content, changed = fix_getters(rel, st, rt, content)
        elif ft == "mutations":
            content, changed = fix_mutations(rel, st, rt, content)
        else:
            continue
        
        if content != old_content:
            with open(rel, "w") as f:
                f.write(content)
            results.append((rel, ft, st))
            print(f"  FIXED {rel} ({ft}, state={st})")
        else:
            print(f"  SKIP {rel} (no changes)")

print(f"\nFixed {len(results)} files")
