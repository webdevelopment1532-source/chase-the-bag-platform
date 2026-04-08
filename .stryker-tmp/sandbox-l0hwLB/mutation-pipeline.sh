
#!/usr/bin/env bash
set -e

# --- Ensure we are in the project root ---
PROJECT_ROOT="/home/cyber44/chase-the-bag-platform"
if [ "$PWD" != "$PROJECT_ROOT" ]; then
  cd "$PROJECT_ROOT" || { echo "[!] Failed to cd to $PROJECT_ROOT. Exiting."; exit 1; }
fi

# --- PRODUCTION-GRADE MUTATION/STACKED FUZZING PIPELINE ---
# Uses: Stryker, afl++, wfuzz, ffuf, wafw00f, zzuf, burpsuite, fuzzdb
# Fails if any Stryker mutants survive. Integrates fuzzdb payloads/wordlists.

# Mutation/Fuzzing Pipeline for Node.js + TypeScript (API, web, binaries, Discord bot)



# 1. Install tools
sudo apt-get update
sudo apt-get install -y afl++ wfuzz ffuf wafw00f zzuf python3-venv git

# Radamsa install (try apt, else build from source)
RADAMSA_AVAILABLE=0
if ! command -v radamsa &> /dev/null; then
  echo "[!] Radamsa not found in apt. Attempting to build from source..."
  if sudo apt-get install -y radamsa; then
    RADAMSA_AVAILABLE=1
  else
    if [ ! -d "/tmp/radamsa" ]; then
      git clone https://github.com/aoh/radamsa.git /tmp/radamsa || { echo "[!] Failed to clone Radamsa repo."; }
    fi
    if [ -d "/tmp/radamsa" ]; then
      cd /tmp/radamsa && make && sudo make install
      cd /home/cyber44/chase-the-bag-platform || { echo "[!] Failed to cd back to project root after Radamsa build."; exit 1; }
      if command -v radamsa &> /dev/null; then
        echo "[+] Radamsa installed successfully from source."
        RADAMSA_AVAILABLE=1
      else
        echo "[!] Radamsa build failed. Skipping Radamsa steps."
      fi
    fi
  fi
else
  RADAMSA_AVAILABLE=1
fi


# 2. Install boofuzz (Python fuzzer) in a venv
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install boofuzz || true
deactivate


# 4. Prepare directories
mkdir -p fuzz/seeds fuzz/out fuzz/mutated fuzz/crashes

# 4b. Link fuzzdb wordlists for easy access
if [ -d "fuzzdb" ]; then
  ln -sf ../fuzzdb/wordlists-user-passwd fuzz/wordlists-user-passwd
  ln -sf ../fuzzdb/wordlists-misc fuzz/wordlists-misc
  ln -sf ../fuzzdb/attack fuzz/attack
  ln -sf ../fuzzdb/discovery fuzz/discovery
fi

# 5. Generate mutated payloads (WAF-A-MoLE, if available)
if command -v wafamole &> /dev/null; then
  wafamole mutate -i fuzz/seeds/payloads.txt -o fuzz/mutated/wafamole.txt || true
fi

# 6. Radamsa mutation
if [ "$RADAMSA_AVAILABLE" = "1" ]; then
  radamsa fuzz/seeds/payloads.txt > fuzz/mutated/radamsa.txt || true
else
  echo "[!] Radamsa not available, skipping Radamsa mutation."
fi



# 7. Stryker mutation testing (fail if any mutants survive)
# Clean up any stale Radamsa temp directories to prevent sandbox issues
rm -rf /tmp/radamsa
# Force Stryker and Jest to use a local temp directory
export TMPDIR="$PWD/.stryker-tmp"
export TEMP="$PWD/.stryker-tmp"
export TMP="$PWD/.stryker-tmp"
npx stryker run
MUTATION_REPORT=".stryker-tmp/sandbox-*/reports/mutation/mutation.html"
if grep -q 'Survived' $MUTATION_REPORT 2>/dev/null; then
  echo "[!] Stryker found surviving mutants. Review the mutation report: $MUTATION_REPORT"
  exit 1
fi


# 8. AFL++ fuzzing (if binary exists)
if [ -f "./target_binary" ]; then
  echo "[+] Running afl-fuzz on ./target_binary"
  afl-fuzz -i fuzz/seeds -o fuzz/out -- ./target_binary || true
fi

# 8b. zzuf fuzzing (if binary exists)
if [ -f "./target_binary" ]; then
  echo "[+] Running zzuf on ./target_binary"
  zzuf -r 0.01-0.10 -s 0:1000 ./target_binary < fuzz/seeds/payloads.txt > fuzz/out/zzuf.log 2>&1 || true
fi


# 9. wfuzz against API (stacked with fuzzdb wordlists)
if [ -f fuzz/mutated/wafamole.txt ]; then
  wfuzz -z file,fuzz/mutated/wafamole.txt http://localhost:3000/FUZZ || true
fi
if [ -d fuzz/wordlists-user-passwd ]; then
  for wlist in fuzz/wordlists-user-passwd/*; do
    wfuzz -z file,$wlist http://localhost:3000/FUZZ || true
  done
fi
if [ -d fuzz/wordlists-misc ]; then
  for wlist in fuzz/wordlists-misc/*; do
    wfuzz -z file,$wlist http://localhost:3000/FUZZ || true
  done
fi


# 10. ffuf mutation (stacked with fuzzdb wordlists)
if [ -f fuzz/mutated/radamsa.txt ]; then
  ffuf -w fuzz/mutated/radamsa.txt -u http://localhost:3000/FUZZ || true
fi
if [ -d fuzz/wordlists-user-passwd ]; then
  for wlist in fuzz/wordlists-user-passwd/*; do
    ffuf -w $wlist -u http://localhost:3000/FUZZ || true
  done
fi
if [ -d fuzz/wordlists-misc ]; then
  for wlist in fuzz/wordlists-misc/*; do
    ffuf -w $wlist -u http://localhost:3000/FUZZ || true
  done
fi


# 11. wafw00f (WAF detection)
if command -v wafw00f &> /dev/null; then
  wafw00f http://localhost:3000 || true
fi

# 12. burpsuite (manual/advanced fuzzing)
if command -v burpsuite &> /dev/null; then
  echo "[+] You can launch burpsuite for advanced manual/automated fuzzing."
fi

echo "[+] All mutation/fuzzing tools completed. Check fuzz/out, fuzz/crashes, and Stryker mutation report."
