#!/usr/bin/env bash
# workflow-check.sh — verify the project-bootstrap workflow artifacts.
#
# Usage: workflow-check.sh [--strict] [--quiet] [TARGET_DIR]
#
# Exit codes: 0 = consistent, 1 = inconsistencies found, 2 = usage error.
#
# Scope: consistency, not progress. It checks that a phase marked `done` really
# has its artifact, that requirements carry no unresolved questions, that ADRs
# have alternatives, that a done slice carries a real acceptance command, and
# that the deploy boxes are ticked. It never runs the project's own test suite:
# the acceptance commands live in PROJECT.md and are the operator's to run.

set -uo pipefail

STRICT=0
QUIET=0
TARGET="."

usage() {
  cat <<'USAGE'
Usage: workflow-check.sh [--strict] [--quiet] [TARGET_DIR]

  --strict  also require every phase (P0..P5) to be `done` or `n/a`
  --quiet   print only warnings and failures

Exit codes: 0 = consistent, 1 = inconsistencies found, 2 = usage error.
USAGE
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --strict)  STRICT=1 ;;
    --quiet)   QUIET=1 ;;
    -h|--help) usage ;;
    -*)        printf 'workflow-check: unknown flag: %s\n' "$1" >&2; usage ;;
    *)         TARGET="$1" ;;
  esac
  shift
done

TARGET="${TARGET%/}"
[ -n "$TARGET" ] || TARGET="/"

PASSES=0
WARNS=0
FAILS=0

pass() { PASSES=$((PASSES + 1)); [ "$QUIET" -eq 1 ] || printf 'PASS  %s\n' "$1"; }
note() { WARNS=$((WARNS + 1)); printf 'WARN  %s\n' "$1"; }
fail() { FAILS=$((FAILS + 1)); printf 'FAIL  %s\n' "$1"; }

TAB=$(printf '\t')

printf 'workflow-check: target %s\n\n' "$TARGET"

PROJECT="$TARGET/PROJECT.md"
if [ ! -f "$PROJECT" ]; then
  fail "PROJECT.md not found at $PROJECT — copy templates/PROJECT.md and fill it in"
  printf '\n%d passed, %d warning(s), %d failure(s)\n' "$PASSES" "$WARNS" "$FAILS"
  exit 1
fi
pass "PROJECT.md found"

# ---- required sections -------------------------------------------------------
for section in "Phase status" "Slices" "Decision log" "Resume"; do
  if grep -qE "^##[[:space:]]+$section[[:space:]]*$" "$PROJECT"; then
    pass "PROJECT.md has '## $section'"
  else
    fail "PROJECT.md is missing the '$section' section"
  fi
done

# ---- tier --------------------------------------------------------------------
TIER=$(sed -n 's/^\*\*Tier:\*\*[[:space:]]*\([SML]\)[[:space:]]*$/\1/p' "$PROJECT" | head -1)
if [ -z "$TIER" ]; then
  fail "PROJECT.md declares no tier — add a line reading exactly '**Tier:** S', '**Tier:** M' or '**Tier:** L'"
else
  pass "tier declared: $TIER"
fi

# ---- phase table -------------------------------------------------------------
PHASE_ROWS=$(awk -F'|' '
  /^\|[[:space:]]*P[0-5][[:space:]]*\|/ {
    p=$2; a=$4; s=$6
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", p)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", a)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", s)
    gsub(/`/, "", a)
    print p "\t" a "\t" s
  }' "$PROJECT")

phase_field() {  # phase_field <phase> <1=artifact|2=status>
  printf '%s\n' "$PHASE_ROWS" | awk -F"$TAB" -v p="$1" -v n="$2" '$1==p {print $(n+1); exit}'
}

for p in P0 P1 P2 P3 P4 P5; do
  n=$(printf '%s\n' "$PHASE_ROWS" | grep -c "^$p$TAB")
  [ "$n" -eq 1 ] || fail "phase table must contain exactly one '$p' row (found $n)"
done

allowed_na() {
  case "$TIER" in
    S) case "$1" in P1|P5) return 0 ;; esac ;;
    M) [ "$1" = "P5" ] && return 0 ;;
  esac
  return 1
}

order_violation=""
for p in P0 P1 P2 P3 P4 P5; do
  st=$(phase_field "$p" 2)
  ar=$(phase_field "$p" 1)
  [ -n "$st" ] || continue

  case " todo in-progress done blocked n/a " in
    *" $st "*) ;;
    *) fail "$p has invalid status '$st' (expected: todo, in-progress, done, blocked, n/a)"; continue ;;
  esac

  if [ "$st" = "n/a" ] && ! allowed_na "$p"; then
    fail "$p is 'n/a' but tier ${TIER:-?} does not allow that phase to be skipped"
  fi

  if [ "$st" = "done" ]; then
    case "$ar" in
      ""|"—"|"-") fail "$p is done but names no artifact" ;;
      *)
        case "$ar" in
          */*|*.md|*.sh|*.txt|*.json|*.yaml|*.yml|*.toml)
            if [ -e "$TARGET/$ar" ]; then
              pass "$p done, artifact present: $ar"
            else
              fail "$p is done but its artifact '$ar' does not exist"
            fi ;;
          *) pass "$p done — artifact is a description, not a path (not verified: '$ar')" ;;
        esac ;;
    esac
  fi

  if [ "$st" != "done" ] && [ "$st" != "n/a" ]; then
    order_violation="$p"
  elif [ "$st" = "done" ] && [ -n "$order_violation" ]; then
    fail "$p is done while the earlier phase $order_violation is not"
  fi
done

# ---- requirements ------------------------------------------------------------
REQ="$TARGET/docs/requirements.md"
P0_DONE=0
[ "$(phase_field P0 2)" = "done" ] && P0_DONE=1

if [ -f "$REQ" ]; then
  pass "requirements document found"
  rq=$(grep -cE '^###[[:space:]]+R[0-9]+' "$REQ")
  if [ "$rq" -ge 1 ]; then
    pass "requirements: $rq numbered requirement(s)"
  else
    fail "requirements: no '### R<n>' headings — requirements must be numbered for slices to reference them"
  fi

  if grep -qE '^##[[:space:]]+Non-goals' "$REQ"; then
    ng=$(awk '/^##[[:space:]]+Non-goals/{f=1;next} /^##[[:space:]]/{f=0} f' "$REQ" \
         | grep -vE '^[[:space:]]*$|^[[:space:]]*>' | wc -l | tr -d ' ')
    if [ "$ng" -ge 1 ]; then
      pass "requirements: non-goals present and non-empty"
    else
      fail "requirements: '## Non-goals' is empty — name what you are deliberately not building"
    fi
  else
    fail "requirements: missing '## Non-goals' section"
  fi

  if grep -qE '^##[[:space:]]+Open questions' "$REQ"; then
    oq=$(awk '/^##[[:space:]]+Open questions/{f=1;next} /^##[[:space:]]/{f=0} f' "$REQ" \
         | grep -vE '^[[:space:]]*$|^[[:space:]]*>' | tr -d '[:space:]')
    if [ "$oq" = "None." ]; then
      pass "requirements: open questions resolved"
    elif [ "$P0_DONE" -eq 1 ]; then
      fail "requirements: P0 is done but '## Open questions' does not read exactly 'None.' (found: ${oq:-<empty>})"
    else
      note "requirements: open questions not yet resolved — this blocks the P0 gate"
    fi
  else
    fail "requirements: missing '## Open questions' section"
  fi
else
  if [ "$P0_DONE" -eq 1 ]; then
    fail "P0 is done but $REQ does not exist"
  else
    note "requirements document not written yet ($REQ)"
  fi
fi

# ---- ADRs --------------------------------------------------------------------
ADR_DIR="$TARGET/docs/adr"
P1_DONE=0
[ "$(phase_field P1 2)" = "done" ] && P1_DONE=1

adr_list=$(find "$ADR_DIR" -maxdepth 1 -type f -name '[0-9][0-9][0-9][0-9]-*.md' 2>/dev/null | sort)
adr_n=$(printf '%s\n' "$adr_list" | grep -c .)

if [ "$P1_DONE" -eq 1 ]; then
  if [ "$adr_n" -ge 1 ]; then
    pass "adr: $adr_n decision record(s)"
  else
    fail "P1 is done but no docs/adr/NNNN-*.md files exist"
  fi
fi

if [ "$adr_n" -ge 1 ]; then
  dups=$(printf '%s\n' "$adr_list" | sed 's|.*/||' | cut -c1-4 | sort | uniq -d | tr '\n' ' ')
  [ -z "$dups" ] || fail "adr: duplicate number(s): $dups"

  nums=$(printf '%s\n' "$adr_list" | sed 's|.*/||' | cut -c1-4 | awk '{print $1+0}' | sort -n -u)
  gaps=$(printf '%s\n' "$nums" | awk 'NR>1 && $1 != prev+1 {printf "%04d-%04d ", prev+1, $1-1} {prev=$1}')
  [ -z "$gaps" ] || note "adr: numbering gap(s): $gaps"

  bad=""
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    base=$(printf '%s' "$f" | sed 's|.*/||')
    for h in Context Decision Alternatives Consequences; do
      grep -qE "^##[[:space:]]+$h" "$f" || bad="$bad $base:$h"
    done
    st=$(sed -n 's/^[[:space:]]*[-*][[:space:]]*\*\*Status:\*\*[[:space:]]*\([A-Za-z][A-Za-z-]*\).*/\1/p' "$f" | head -1)
    if [ -z "$st" ]; then
      bad="$bad $base:Status"
    else
      case " proposed accepted rejected superseded deprecated " in
        *" $st "*) ;;
        *) bad="$bad $base:Status=$st" ;;
      esac
    fi
  done <<ADR_EOF
$adr_list
ADR_EOF
  if [ -z "$bad" ]; then
    pass "adr: every record has Status/Context/Decision/Alternatives/Consequences"
  else
    fail "adr: incomplete record(s):$bad"
  fi

  acc=$(while IFS= read -r f; do
          [ -n "$f" ] || continue
          sed -n 's/^[[:space:]]*[-*][[:space:]]*\*\*Status:\*\*[[:space:]]*\([A-Za-z][A-Za-z-]*\).*/\1/p' "$f" | head -1
        done <<ACCEPTED_EOF
$adr_list
ACCEPTED_EOF
)
  acc_n=$(printf '%s\n' "$acc" | grep -c '^accepted$')
  if [ "$P1_DONE" -eq 1 ] && [ "$acc_n" -eq 0 ]; then
    fail "P1 is done but no ADR has Status 'accepted'"
  fi
fi

# ---- slices ------------------------------------------------------------------
P2_DONE=0
[ "$(phase_field P2 2)" = "done" ] && P2_DONE=1

srows=$(awk '/^##[[:space:]]+Slices/{f=1;next} /^##[[:space:]]/{f=0} f' "$PROJECT" \
        | grep -E '^\|[[:space:]]*S[0-9]+[[:space:]]*\|')
slices_n=$(printf '%s\n' "$srows" | grep -c .)

if [ "$P2_DONE" -eq 1 ] && [ "$slices_n" -eq 0 ]; then
  fail "P2 is done but the '## Slices' table has no rows"
fi
if [ "$slices_n" -ge 1 ]; then
  pass "slices: $slices_n row(s)"

  sid_of()  { printf '%s' "$1" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$2); print $2}'; }
  acc_of()  { printf '%s' "$1" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$5); print $5}'; }
  st_of()   { printf '%s' "$1" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/,"",$6); print $6}'; }

  sbad=""
  while IFS= read -r row; do
    [ -n "$row" ] || continue
    sid=$(sid_of "$row")
    sacc=$(acc_of "$row")
    sst=$(st_of "$row")
    case " todo in-progress done dropped " in
      *" $sst "*) ;;
      *) sbad="$sbad $sid:status=$sst"; continue ;;
    esac
    if [ "$sst" = "done" ]; then
      case "$sacc" in
        ""|"—"|"-")  sbad="$sbad $sid:no-acceptance-command" ;;
        *'<'*'>'*)   sbad="$sbad $sid:placeholder-acceptance-command" ;;
      esac
    fi
  done <<SLICE_EOF
$srows
SLICE_EOF
  if [ -z "$sbad" ]; then
    pass "slices: every done slice carries a real acceptance command"
  else
    fail "slices: problem(s):$sbad"
  fi
fi

# ---- deploy ------------------------------------------------------------------
P5_DONE=0
[ "$(phase_field P5 2)" = "done" ] && P5_DONE=1
if [ "$P5_DONE" -eq 1 ]; then
  dep_art=$(phase_field P5 1)
  [ -n "$dep_art" ] || dep_art="docs/deploy.md"
  dep="$TARGET/$dep_art"
  if [ ! -f "$dep" ]; then
    fail "P5 is done but the deploy checklist '$dep_art' does not exist"
  else
    open_boxes=$(grep -cE '^[[:space:]]*-[[:space:]]*\[[[:space:]]\]' "$dep")
    if [ "$open_boxes" -eq 0 ]; then
      pass "deploy: checklist complete ($dep_art)"
    else
      fail "deploy: $open_boxes unticked box(es) in $dep_art"
    fi
    for k in Rollback "Smoke test"; do
      grep -qE "^##[[:space:]]+[0-9.]*[[:space:]]*$k" "$dep" || note "deploy: no '$k' section in $dep_art"
    done
  fi
fi

# ---- strict ------------------------------------------------------------------
if [ "$STRICT" -eq 1 ]; then
  incomplete=""
  for p in P0 P1 P2 P3 P4 P5; do
    st=$(phase_field "$p" 2)
    case "$st" in
      done|n/a) ;;
      *) incomplete="$incomplete $p(${st:-missing})" ;;
    esac
  done
  if [ -z "$incomplete" ]; then
    pass "strict: every phase is done or n/a"
  else
    fail "strict: phase(s) not complete:$incomplete"
  fi
fi

printf '\n%d passed, %d warning(s), %d failure(s)\n' "$PASSES" "$WARNS" "$FAILS"
[ "$FAILS" -eq 0 ] && exit 0
exit 1
