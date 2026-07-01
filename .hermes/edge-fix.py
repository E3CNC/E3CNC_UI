#!/usr/bin/env python3
"""Edge-case fix pass for remaining store files."""
import os, re

os.chdir("/Users/isaaceliape/repos/e3cnc")

def fix_edge_cases(fp):
    with open(fp) as f:
        content = f.read()
    original = content
    
    # 1. Fix getters where state still untyped (method-shorthand inside getter object)
    # Pattern: `    getterName(state,` or `    getterName(state)`
    # Only inside exported getter: export const getters: GetterTree<...> = {
    if 'export const getters: GetterTree<' in content:
        m = re.search(r'export\s+const\s+getters:\s*GetterTree<([^,]+),', content)
        if m:
            st = m.group(1).strip()
            # Fix method shorthand getters: `    getX(state,` → `    getX(state: ST,`
            content = re.sub(
                r'(\n\s+\w+)\(\bstate\b(?!\s*:)',
                lambda m2: m2.group(1) + '(state: ' + st,
                content
            )
            # Fix `getters` param in getters
            content = re.sub(
                r'(state\s*:\s*\w+\s*,\s*)getters\b(?!\s*:)',
                r'\1getters: any',
                content
            )
            # Fix `rootGetters` param
            content = re.sub(
                r'(rootState\s*:\s*\w+\s*,\s*)rootGetters\b(?!\s*:)',
                r'\1rootGetters: any',
                content
            )
    
    # 2. Fix actions with _ (unused context) — in ActionTree
    if 'export const actions: ActionTree<' in content:
        m = re.search(r'export\s+const\s+actions:\s*ActionTree<([^,]+),\s*([^>]+)>', content)
        if m:
            st = m.group(1).strip()
            rt = m.group(2).strip()
            # Fix `(_, payload)` → `(_context: ActionContext<ST, RT>, payload: any)`
            content = re.sub(
                r'\(\s*_\s*,\s*(\w+)\s*\)\s*\{',
                lambda m2: '(_context: ActionContext<' + st + ', ' + rt + '>, ' + m2.group(1) + ': any) {',
                content
            )
            # Fix `(_, cb)` → `(_context: ActionContext<ST, RT>, cb: any)`
            content = re.sub(
                r'\(\s*_\s*,\s*(\w+)\s*\)\s*=>',
                lambda m2: '(_context: ActionContext<' + st + ', ' + rt + '>, ' + m2.group(1) + ': any) =>',
                content
            )
            # Fix async: `async action(_, payload)`
            content = re.sub(
                r'async\s+\w+\(\s*_\s*,\s*(\w+)\s*\)',
                lambda m2: 'async _action(_context: ActionContext<' + st + ', ' + rt + '>, ' + m2.group(1) + ': any)',
                content
            )
    
    # 3. Fix mutations where state now typed but payload still any
    if 'export const mutations: MutationTree<' in content:
        m = re.search(r'export\s+const\s+mutations:\s*MutationTree<([^>]+)>', content)
        if m:
            st = m.group(1).strip()
            # Add :any to second param: `state: ST, payload)` → `state: ST, payload: any)`
            content = re.sub(
                r'(state\s*:\s*\w+\s*,\s*)(payload|data|name)\s*\)(\s*\{)',
                r'\1\2: any)\3',
                content
            )
    
    # 4. Fix remaining callback params like `current` in .filter/reduce callbacks
    # These are harder to fix generically. Skip for now.
    
    if content != original:
        with open(fp, "w") as f:
            f.write(content)
        return True
    return False

fixed = 0
for root, dirs, files in os.walk("src/store"):
    for f in files:
        if not f.endswith(".ts"):
            continue
        if fix_edge_cases(os.path.join(root, f)):
            fixed += 1
            print(f"  FIXED {os.path.relpath(os.path.join(root,f))}")

print(f"\nFixed {fixed} files")
