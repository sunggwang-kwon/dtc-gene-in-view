#!/usr/bin/env bash

# ==============================================================================
# dtc-gene-in-view Project Remote Deployment Script
# ==============================================================================

set -e

CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
BLUE='\033[1;34m'
MAGENTA='\033[1;35m'
BOLD='\033[1m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="$SCRIPT_DIR/.deploy.env"

# Flags
DRY_RUN=false
AUTO_CONFIRM=false

for arg in "$@"; do
  case $arg in
    -d|--dry-run)
      DRY_RUN=true
      ;;
    -y|--yes)
      AUTO_CONFIRM=true
      ;;
  esac
done

echo -e "${CYAN}================================================================${RESET}"
if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}🧪 [시뮬레이션 모드] 실제 업로드하지 않고 변경 대상 파일만 확인합니다${RESET}"
else
  echo -e "  ${GREEN}🚀 dtc-gene-in-view 프로젝트 원격 서버 배포 스크립트${RESET}"
fi
echo -e "${CYAN}================================================================${RESET}"

# 1. Load variables (.deploy.env fallback + Secret Manager 1st priority)
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
fi

GET_SECRET_HELPER="/home/sgkwon/scripts/get-gcp-secret.mjs"
if [ -x "$GET_SECRET_HELPER" ]; then
  SM_PASS=$("$GET_SECRET_HELPER" DTC_GENE_SFTP_PASS 2>/dev/null || true)
  if [ -n "$SM_PASS" ]; then
    REMOTE_PASS="$SM_PASS"
  fi
  SM_HOST=$("$GET_SECRET_HELPER" DTC_GENE_SFTP_HOST 2>/dev/null || true)
  if [ -n "$SM_HOST" ]; then
    REMOTE_HOST="${SM_HOST%%:*}"
    if [[ "$SM_HOST" == *:* ]]; then
      REMOTE_PORT="${SM_HOST##*:}"
    fi
  fi
  SM_USER=$("$GET_SECRET_HELPER" DTC_GENE_SFTP_USER 2>/dev/null || true)
  if [ -n "$SM_USER" ]; then
    REMOTE_USER="$SM_USER"
  fi
fi

if [ -z "$REMOTE_PASS" ] || [ -z "$REMOTE_HOST" ]; then
  echo -e "${RED}❌ 설정 파일(.deploy.env) 또는 Secret Manager 접속 정보를 찾을 수 없습니다!${RESET}"
  exit 1
fi

REMOTE_PROTO="${REMOTE_PROTO:-sftp}"
REMOTE_PORT="${REMOTE_PORT:-22022}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/html/view}"

# 2. Check dist directory
if [ ! -d "$SCRIPT_DIR/dist" ]; then
  echo -e "${RED}❌ 빌드 결과물(dist) 폴더를 찾을 수 없습니다!${RESET}"
  echo -e "   먼저 로컬에서 ${YELLOW}pnpm run build${RESET}를 실행하여 빌드를 완료한 후 배포해 주세요."
  echo -e "${CYAN}================================================================${RESET}"
  exit 1
fi

echo -e "  ${BLUE}📦 로컬 빌드 경로${RESET} : $SCRIPT_DIR/dist"
echo -e "  ${BLUE}🌐 대상 원격 서버${RESET} : ${BOLD}$REMOTE_PROTO://$REMOTE_HOST:$REMOTE_PORT${RESET}"
echo -e "  ${BLUE}👤 접속 계정명  ${RESET} : $REMOTE_USER"
echo -e "  ${BLUE}📂 원격 대상 경로${RESET} : ${BOLD}$REMOTE_DIR${RESET}"
if [ "$DRY_RUN" = true ]; then
  echo -e "  ${MAGENTA}⚡ 실행 모드    ${RESET} : ${YELLOW}DRY-RUN (안전 시뮬레이션 - 실제 전송 안 함)${RESET}"
fi
echo -e "${CYAN}================================================================${RESET}"

# 3. Confirmation prompt
if [ "$AUTO_CONFIRM" = false ]; then
  if [ "$DRY_RUN" = true ]; then
    read -p "시뮬레이션을 시작하시겠습니까? (y/n) [y]: " CONFIRM
  else
    read -p "위 원격 서버로 dist 파일들을 업로드하시겠습니까? (y/n) [y]: " CONFIRM
  fi
  CONFIRM=${CONFIRM:-y}
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️ 작업이 취소되었습니다.${RESET}"
    exit 0
  fi
fi

echo -e "\n${BLUE}⏳ 원격 서버에 연결하여 파일 변경 사항을 비교 중...${RESET}"

# 4. Run lftp mirror upload (Smart Sync: skip identical files, upload new/changed only)
MIRROR_FLAGS="-R --verbose --ignore-time"
if [ "$DRY_RUN" = true ]; then
  MIRROR_FLAGS="-R --verbose --dry-run --ignore-time"
fi

LFTP_COMMANDS="
set net:timeout 15
set net:max-retries 3
set ssl:verify-certificate no
set sftp:auto-confirm yes
set mirror:overwrite yes
mirror $MIRROR_FLAGS ./dist $REMOTE_DIR
"

if [ "$DRY_RUN" = false ]; then
  LFTP_COMMANDS="$LFTP_COMMANDS
put -O $REMOTE_DIR ./dist/index.html
"
fi

LFTP_COMMANDS="$LFTP_COMMANDS
quit
"

if lftp -u "$REMOTE_USER","$REMOTE_PASS" -p "$REMOTE_PORT" "$REMOTE_PROTO://$REMOTE_HOST" -e "$LFTP_COMMANDS"; then
  echo -e "\n${GREEN}================================================================${RESET}"
  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}🧪 시뮬레이션 완료! (실제 파일은 변경되지 않았습니다)${RESET}"
    echo -e "  실제 배포하시려면: ${GREEN}pnpm run deploy${RESET} 또는 ${GREEN}./deploy.sh${RESET}"
  else
    echo -e "  ${GREEN}✨ 배포가 성공적으로 완료되었습니다! 🎉${RESET}"
    echo -e "  🌐 원격 서버 경로: ${BOLD}$REMOTE_DIR${RESET}"
  fi
  echo -e "${GREEN}================================================================${RESET}\n"
else
  echo -e "\n${RED}================================================================${RESET}"
  echo -e "  ${RED}❌ 연결 또는 배포 중 오류가 발생했습니다.${RESET}"
  echo -e "  접속 IP, 계정, 비밀번호, 대상 경로 권한을 확인해 주세요."
  echo -e "${RED}================================================================${RESET}\n"
  exit 1
fi
