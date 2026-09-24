#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_SERVICE="web-portfolio-api"
readonly DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
readonly REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly REMOTE_REF="origin/${DEPLOY_BRANCH}"
readonly LIVE_JAR="${REPO_DIR}/server/target/aptis-api-0.1.0.jar"
readonly LOCK_FILE="/tmp/web-portfolio-deploy.lock"

candidate_parent=""
candidate_dir=""

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

cleanup() {
  if [[ -n "${candidate_dir}" ]] && git -C "${REPO_DIR}" worktree list --porcelain | grep -Fqx "worktree ${candidate_dir}"; then
    git -C "${REPO_DIR}" worktree remove --force "${candidate_dir}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${candidate_parent}" && -d "${candidate_parent}" ]]; then
    rmdir "${candidate_parent}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

for command in git node mvn curl flock sudo systemctl; do
  command -v "${command}" >/dev/null 2>&1 || fail "Missing required command: ${command}"
done

exec 9>"${LOCK_FILE}"
flock -n 9 || fail "Another deployment is already running."

cd "${REPO_DIR}"
[[ "$(git branch --show-current)" == "${DEPLOY_BRANCH}" ]] || fail "VPS must be on branch ${DEPLOY_BRANCH}."
[[ -z "$(git status --porcelain)" ]] || fail "Working tree is not clean. Commit, stash, or remove local changes first."

log "Fetching ${REMOTE_REF}..."
git fetch --prune origin "${DEPLOY_BRANCH}"

current_sha="$(git rev-parse HEAD)"
target_sha="$(git rev-parse "${REMOTE_REF}")"

if [[ "${current_sha}" == "${target_sha}" ]]; then
  log "Already deployed: ${current_sha}"
  exit 0
fi

git merge-base --is-ancestor "${current_sha}" "${target_sha}" || fail "Local branch has diverged from ${REMOTE_REF}; refusing a non-fast-forward deploy."

if git diff --name-only "${current_sha}" "${target_sha}" | grep -q '^server/src/main/resources/db/migration/'; then
  [[ "${DEPLOY_ALLOW_MIGRATIONS:-0}" == "1" ]] || fail "Database migrations changed. Back up PostgreSQL, then rerun with DEPLOY_ALLOW_MIGRATIONS=1."
fi

candidate_parent="$(mktemp -d /tmp/web-portfolio-deploy.XXXXXX)"
candidate_dir="${candidate_parent}/release"
log "Validating candidate ${target_sha}..."
git worktree add --detach "${candidate_dir}" "${target_sha}" >/dev/null

node "${candidate_dir}/scripts/validate-content.mjs"
node --check "${candidate_dir}/js/engine.js"
node --check "${candidate_dir}/js/dashboard.js"
node --check "${candidate_dir}/sw.js"

log "Running backend tests and building JAR..."
mvn -q -f "${candidate_dir}/server/pom.xml" clean package

candidate_jar="${candidate_dir}/server/target/aptis-api-0.1.0.jar"
[[ -f "${candidate_jar}" ]] || fail "Build completed without the expected JAR."

log "Fast-forwarding production checkout..."
git merge --ff-only "${REMOTE_REF}"
mkdir -p "$(dirname "${LIVE_JAR}")"
install -m 0644 "${candidate_jar}" "${LIVE_JAR}"

log "Restarting ${APP_SERVICE}..."
sudo systemctl restart "${APP_SERVICE}"

api_status="000"
for _ in {1..15}; do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8082/api/auth/me || true)"
  if [[ "${api_status}" == "200" || "${api_status}" == "401" || "${api_status}" == "403" ]]; then
    break
  fi
  sleep 2
done
[[ "${api_status}" == "200" || "${api_status}" == "401" || "${api_status}" == "403" ]] || fail "API health check failed with HTTP ${api_status}."

site_status="$(curl -sS -o /dev/null -w '%{http_code}' https://learn.hoangdm.com/english.html || true)"
[[ "${site_status}" == "200" ]] || fail "Website health check failed with HTTP ${site_status}."

deployed_sha="$(git rev-parse HEAD)"
log "Deployment successful: ${deployed_sha}"
log "API HTTP ${api_status}; website HTTP ${site_status}."
