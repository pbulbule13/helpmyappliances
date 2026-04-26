terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "helpmyappliances-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "helpmyappliances"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "helpmyappliances"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "main" {
  name             = "helpmyappliances-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = "db-f1-micro" # Start small, scale later

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
  }

  deletion_protection = true
  depends_on          = [google_project_service.apis]
}

resource "google_sql_database" "app" {
  name     = "helpmyappliances"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "app"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Redis (Memorystore)
resource "google_redis_instance" "main" {
  name           = "helpmyappliances-redis"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  depends_on = [google_project_service.apis]
}

# Cloud Storage bucket for uploads
resource "google_storage_bucket" "uploads" {
  name     = "${var.project_id}-uploads"
  location = var.region

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 365
    }
  }
}

# Cloud Run service
resource "google_cloud_run_v2_service" "backend" {
  name     = "helpmyappliances-api"
  location = var.region

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/helpmyappliances/backend:latest"

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      env {
        name  = "APP_ENV"
        value = "production"
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql+asyncpg://app:${var.db_password}@/${google_sql_database.app.name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
      }

      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}/0"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.uploads.name
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    vpc_access {
      egress = "ALL_TRAFFIC"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [google_project_service.apis]
}

# Allow unauthenticated access to Cloud Run
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "api_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "db_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "redis_host" {
  value = google_redis_instance.main.host
}

output "storage_bucket" {
  value = google_storage_bucket.uploads.name
}
