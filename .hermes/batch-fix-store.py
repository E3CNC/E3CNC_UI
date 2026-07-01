#!/usr/bin/env python3
"""Batch-fix TypeScript store files with implicit-any parameter errors."""

import re
import sys
import os
import json

os.chdir("/Users/isaaceliape/repos/e3cnc")


def read_file(path):
    with open(path) as f:
        return f.read()


def write_file(path, content):
    with open(path, "w") as f:
        f.write(content)


def extract_state_type(content, filetype):
    """Extract State and RootState types from the typed export."""
    if filetype == "getters":
        m = re.search(r'export\s+const\s+getters:\s*GetterTree<([^,]+),\s*([^>]+)>\s*=\s*{', content)
    elif filetype == "actions":
        m = re.search(r'export\s+const\s+actions:\s*ActionTree<([^,]+),\s*([^>]+)>\s*=\s*{', content)
    elif filetype == "mutations":
        m = re.search(r'export\s+const\s+mutations:\s*MutationTree<([^>]+)>\s*=\s*{', content)
    else:
        return None, None
    if m:
        if filetype == "mutations":
            return m.group(1).strip(), None
        return m.group(1).strip(), m.group(2).strip()
    return None, None


def needs_action_context_import(content):
    """Check if ActionContext needs to be imported."""
    if "ActionContext" in content:
        return False
    return bool(re.search(r'export\s+const\s+actions:\s*ActionTree<', content))


def add_action_context_import(content):
    """Add ActionContext to vuex import."""
    content = re.sub(
        r"(import\s*\{\s*)(ActionTree)(\s*\}\s*from\s+['\"]vuex['\"])",
        r"\1ActionContext, \2\3",
        content
    )
    return content


def fix_getters(content, state_type, root_state_type):
    """Fix getter function params."""
    if not state_type:
        return content
    
    lines = content.split("\n")
    fixed_lines = []
    
    for line in lines:
        # Fix (state, → (state: STATE_TYPE,  — only in function arrow definitions
        # Match pattern like `: (state,` or `: (state)` or `: (state) =>`
        
        # : (state, → : (state: STATE_TYPE,
        line = re.sub(
            r'(:\s*)\(state\b(?!\s*:)',
            r'\1(state: ' + state_type,
            line
        )
        
        # Fix , rootState, or , rootState) where rootState doesn't have type
        # Only if we have a root state type
        if root_state_type and root_state_type != state_type:
            line = re.sub(
                r'\brootState\b(?!\s*:)',
                'rootState: ' + root_state_type,
                line
            )
        
        fixed_lines.append(line)
    
    return "\n".join(fixed_lines)


def fix_actions(content, state_type, root_state_type):
    """Fix action function params."""
    if not state_type:
        return content
    
    lines = content.split("\n")
    fixed_lines = []
    
    in_actions = False
    brace_depth = 0
    
    for i, line in enumerate(lines):
        # Detect start/end of actions object
        if re.search(r'export\s+const\s+actions:\s*ActionTree<', line):
            in_actions = True
        
        if in_actions:
            brace_depth += line.count("{") - line.count("}")
        
        if in_actions and 0 < brace_depth:
            # We're inside the actions object
            # Fix destructured context params: ({ ... }) → ({ ... }: ActionContext<STATE, ROOT>)
            
            # Skip lines that already have ActionContext typing
            if "ActionContext<" in line:
                fixed_lines.append(line)
                continue
            
            # Fix single-line: actionName({ ... }, payload) {
            # → actionName({ ... }: ActionContext<STATE, ROOT>, payload: any) {
            m = re.match(r'^(\s+)(\w+|\w+Async)\(({[^}]+})\s*(,\s*(\w+)\s*)?\)\s*(?:\{|:\s*(?:any|unknown)\s*=>\s*\{|\{)', line)
            if m:
                indent = m.group(1)
                name = m.group(2)
                destructured = m.group(3)
                second_param_raw = m.group(4) or ""
                second_param = m.group(5) or ""
                
                # Only fix if destructured (starts with {)
                new_second = ""
                if second_param:
                    # Add : any if not already typed
                    if ":" not in second_param_raw:
                        new_second = f", {second_param}: any"
                    else:
                        new_second = second_param_raw
                
                # Check if line has arrow function
                if "=>" in line:
                    new_line = f"{indent}{name}({destructured}: ActionContext<{state_type}, {root_state_type}>{new_second}) => {{"
                else:
                    new_line = f"{indent}{name}({destructured}: ActionContext<{state_type}, {root_state_type}>{new_second}) {{"
                
                fixed_lines.append(new_line)
                continue
            
            # Fix _(_, payload) or (_, payload) patterns
            if re.match(r'^\s+(\w+)\(\s*_\s*,\s*(\w+)\s*\)\s*\{', line):
                new_line = re.sub(
                    r'\(\s*_\s*,\s*(\w+)\s*\)',
                    lambda m: f'(_context: ActionContext<{state_type}, {root_state_type}>, {m.group(1)}: any)',
                    line
                )
                fixed_lines.append(new_line)
                continue
            
            # Fix _(_, payload) => or (_, payload) => patterns (arrow functions)
            if re.match(r'^\s+(\w+)\(\s*_\s*,\s*(\w+)\s*\)\s*=>', line):
                new_line = re.sub(
                    r'\(\s*_\s*,\s*(\w+)\s*\)\s*=>',
                    lambda m: f'(_context: ActionContext<{state_type}, {root_state_type}>, {m.group(1)}: any) =>',
                    line
                )
                fixed_lines.append(new_line)
                continue
        
        fixed_lines.append(line)
    
    return "\n".join(fixed_lines)


def fix_mutations(content, state_type):
    """Fix mutation function params."""
    if not state_type:
        return content
    
    lines = content.split("\n")
    fixed_lines = []
    
    for line in lines:
        # Fix (state, → (state: STATE_TYPE,  — only in mutation definitions
        # Mutation lines typically look like: `    mutationName(state, payload) {`
        # Or just `    mutationName(state) {`
        
        line = re.sub(
            r'(:\s*)\(state\b(?!\s*:)',
            r'\1(state: ' + state_type,
            line
        )
        
        fixed_lines.append(line)
    
    return "\n".join(fixed_lines)


def classify_file(path):
    """Determine file type from content and path."""
    content = read_file(path)
    if re.search(r'export\s+const\s+getters:\s*GetterTree<', content):
        return "getters", content
    if re.search(r'export\s+const\s+actions:\s*ActionTree<', content):
        return "actions", content
    if re.search(r'export\s+const\s+mutations:\s*MutationTree<', content):
        return "mutations", content
    return None, content


# Files to skip (need manual handling)
skip_files = {
    "src/store/variables.ts",
    "src/store/server/index.ts",
    "src/store/gui/index.ts",
    "src/store/farm/index.ts",
    "src/store/gui/types.ts",
    "src/store/server/actions.ts",  # Already has ActionContext fixes, but has router.currentRoute.path issue
}

store_dir = "src/store"
fixed_count = 0
total_errors_before = 0

# Collect all .ts files in store
all_files = []
for root, dirs, files in os.walk(store_dir):
    for f in files:
        if f.endswith(".ts"):
            all_files.append(os.path.join(root, f))

for fpath in sorted(all_files):
    relpath = os.path.relpath(fpath, ".")
    if relpath in skip_files:
        continue
    
    filetype, content = classify_file(relpath)
    if not filetype:
        continue
    
    # Count implicit any errors before
    before_errors = len(re.findall(r'(?:implicitly has an \'any\' type|Binding element.*implicitly has an \'any\' type)', content))
    # (This is a rough count - actual count from vue-tsc would be better)
    
    state_type, root_type = extract_state_type(content, filetype)
    if not state_type:
        continue
    
    new_content = content
    if filetype == "getters":
        new_content = fix_getters(content, state_type, root_type)
    elif filetype == "actions":
        if needs_action_context_import(content):
            content = add_action_context_import(content)
        new_content = fix_actions(content, state_type, root_type)
    elif filetype == "mutations":
        new_content = fix_mutations(content, state_type)
    
    if new_content != content:
        write_file(relpath, new_content)
        fixed_count += 1
        print(f"  FIXED {relpath} ({filetype}, state={state_type})")
    else:
        print(f"  SKIP {relpath} (no changes)")

print(f"\nFixed {fixed_count} files")
