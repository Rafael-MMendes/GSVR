import subprocess
import glob
import sys

files = glob.glob('backend/controllers/*.js') + glob.glob('backend/routes/*.js') + glob.glob('backend/middleware/*.js') + glob.glob('backend/utils/*.js')

print(f"Checking syntax for {len(files)} files...")
errors = 0
for f in sorted(files):
    res = subprocess.run(['node', '-c', f], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"❌ SYNTAX ERROR in {f}:\n{res.stderr}")
        errors += 1
    else:
        print(f"✅ {f:45s} OK")

if errors == 0:
    print("\n🎉 ALL FILES PASSED NODE SYNTAX CHECK!")
else:
    print(f"\n❌ {errors} files had syntax errors.")
    sys.exit(1)

