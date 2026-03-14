#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${HOME}/.config/learning-english/config.toml"
DEFAULT_DATA_DIR="${HOME}/artifacts/english-learning/data"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--data-dir <path>]

Initialize the weekly learning data directory for the current week.

Options:
  --data-dir <path>   Override data directory (default: read from config or ${DEFAULT_DATA_DIR})
  --help              Show this message
EOF
}

read_config_value() {
  local key="$1"
  if [[ -f "${CONFIG_FILE}" ]]; then
    grep -E "^${key}\s*=" "${CONFIG_FILE}" | head -1 | sed -E 's/^[^=]+=\s*["'"'"']?([^"'"'"']*)["'"'"']?\s*$/\1/'
  fi
}

DATA_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --data-dir)
      DATA_DIR="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${DATA_DIR}" ]]; then
  DATA_DIR="$(read_config_value "data_dir")"
fi

if [[ -z "${DATA_DIR}" ]]; then
  DATA_DIR="${LEARNING_DATA_DIR:-${DEFAULT_DATA_DIR}}"
fi

DATA_DIR="${DATA_DIR/#\~/${HOME}}"

YEAR="$(date +%Y)"
MONTH="$(date +%m)"
DAY="$(date +%d)"
WEEK_IN_MONTH=$(( (10#$DAY - 1) / 7 + 1 ))
WEEK_DIR="${DATA_DIR}/${YEAR}/${MONTH}/week${WEEK_IN_MONTH}"

echo "📁 Data directory : ${DATA_DIR}"
echo "📅 Current week   : ${YEAR}/${MONTH}/week${WEEK_IN_MONTH}"
echo ""

mkdir -p "${WEEK_DIR}"
DAY_DIR="${WEEK_DIR}/day1"
mkdir -p "${DAY_DIR}"

create_if_missing() {
  local file="$1"
  local content="$2"
  if [[ ! -f "${file}" ]]; then
    echo "${content}" > "${file}"
    echo "  ✅ Created : ${file#${DATA_DIR}/}"
  else
    echo "  ⏭  Exists  : ${file#${DATA_DIR}/}"
  fi
}

create_if_missing "${WEEK_DIR}/topic.md" "# Topic — ${YEAR}/${MONTH}/week${WEEK_IN_MONTH}

## Japanese Input


## Keywords


## Summary
"

create_if_missing "${WEEK_DIR}/words.md" "# Words — ${YEAR}/${MONTH}/week${WEEK_IN_MONTH}

| Word | Translation | Example |
|------|-------------|---------|
"

create_if_missing "${DAY_DIR}/reading.md" "# Reading — ${YEAR}/${MONTH}/week${WEEK_IN_MONTH}

CEFR: B1 | Words: 0

"

create_if_missing "${DAY_DIR}/feedback.md" "# Feedback — ${YEAR}/${MONTH}/week${WEEK_IN_MONTH}

"

echo ""
echo "Done. Run the TUI with:"
echo "  go run cmd/tui/main.go --data-dir \"${DATA_DIR}\""
echo ""
echo "Or save the path to config:"
echo "  go run cmd/tui/main.go --init-config"
echo "  # Then edit ${CONFIG_FILE}"
