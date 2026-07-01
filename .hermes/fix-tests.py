#!/usr/bin/env python3
"""Fix test files: cast wrapper.vm property accesses to any."""
import os, re

os.chdir("/Users/isaaceliape/repos/e3cnc")

def fix_test_file(fp):
    with open(fp) as f:
        content = f.read()
    original = content
    
    # Replace `wrapper.vm.property` → `(wrapper.vm as any).property`
    # Uses negative lookbehind to avoid double-casting
    content = re.sub(
        r'(?<!as any\)\.)\bwrapper\.vm\.(\w+)',
        r'(wrapper.vm as any).\1',
        content
    )
    
    # Replace `wrapper.vm[` → `(wrapper.vm as any)[`
    content = re.sub(
        r'wrapper\.vm\[',
        r'(wrapper.vm as any)[',
        content
    )
    
    if content != original:
        with open(fp, "w") as f:
            f.write(content)
        return True
    return False

fixed = 0
for root, dirs, files in os.walk("tests"):
    for f in files:
        if not f.endswith(".spec.ts"):
            continue
        if fix_test_file(os.path.join(root, f)):
            fixed += 1
            print(f"  FIXED {os.path.relpath(os.path.join(root, f))}")

print(f"\nFixed {fixed} files")
