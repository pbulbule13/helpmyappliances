#!/bin/bash
# GCP one-time setup script for HelpMyAppliances
# Run once before first deployment: bash infra/gcp-setup.sh
# Requirements: gcloud CLI, authenticated as project owner

set -euo pipefail

PROJECT_ID="helpmyappliances"
REGION="us-central1"
DB_INSTANCE="helpmyappliances-pg"
DB_NAME="helpmyappliances"
DB_USER="app"

echo "==> Setting project..."
gcloud config set project $PROJECT_ID

echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  redis.googleapis.com

echo "==> Creating Artifact Registry repository..."
gcloud artifacts repositories create helpmyappliances \
  --repository-format=docker \
  --location=$REGION \
  --description="HelpMyAppliances container images" || true

echo "==> Creating Cloud SQL instance (PostgreSQL 16 + pgvector)..."
gcloud sql instances create $DB_INSTANCE \
  --database-version=POSTGRES_16 \
  --tier=db-g1-small \
  --region=$REGION \
  --database-flags=cloudsql.enable_pg_cron=on \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00 || true

echo "==> Creating database and user..."
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE || true
DB_PASSWORD=$(openssl rand -base64 24)
gcloud sql users create $DB_USER --instance=$DB_INSTANCE --password="$DB_PASSWORD" || true

# Get Cloud SQL connection name
SQL_CONN=$(gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)")
DB_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@/helpmyappliances?host=/cloudsql/${SQL_CONN}"

echo "==> Creating GCS bucket for uploads..."
gcloud storage buckets create gs://helpmyappliances-uploads \
  --location=$REGION \
  --uniform-bucket-level-access || true

echo "==> Storing secrets in Secret Manager..."
echo -n "$DB_URL" | gcloud secrets create helpmyappliances-db-url --data-file=- || \
  echo -n "$DB_URL" | gcloud secrets versions add helpmyappliances-db-url --data-file=-

echo "NOTE: Add REDIS_URL, EURI_API_KEY, FIREBASE_CREDENTIALS manually:"
echo "  gcloud secrets create helpmyappliances-redis-url --data-file=-"
echo "  gcloud secrets create helpmyappliances-euri-key --data-file=-"
echo "  gcloud secrets create helpmyappliances-firebase-creds --data-file=-"

echo ""
echo "==> Granting Cloud Build access to secrets and Cloud Run..."
BUILD_SA="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$BUILD_SA" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$BUILD_SA" \
  --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$BUILD_SA" \
  --role="roles/iam.serviceAccountUser"

echo ""
echo "✅ GCP setup complete."
echo "   DB password stored in Secret Manager: helpmyappliances-db-url"
echo "   Cloud SQL instance: $SQL_CONN"
echo "   Next: push to main branch to trigger Cloud Build deployment"
