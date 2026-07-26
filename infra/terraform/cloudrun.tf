resource "google_service_account" "api" {
  account_id   = "sahayak-${var.environment}-api"
  display_name = "Sahayak API Cloud Run service account"
}

# ADC path for Firebase Admin on Cloud Run (org policy blocks SA key download).
resource "google_project_iam_member" "api_firebase_admin" {
  project = var.project_id
  role    = "roles/firebase.admin"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_database_url" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_redis_url" {
  secret_id = google_secret_manager_secret.redis_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_nvidia_api_key" {
  count     = var.nvidia_api_key != "" ? 1 : 0
  secret_id = google_secret_manager_secret.nvidia_api_key[0].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_cloud_run_v2_service" "api" {
  name     = "sahayak-${var.environment}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.main.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.api_image

      ports {
        # Cloud Run default; Nest listens on process.env.PORT (injected to match).
        container_port = 8080
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_url.secret_id
            version = "latest"
          }
        }
      }

      # PORT is reserved by Cloud Run v2 — do not set it; Nest listens on process.env.PORT.

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "FIREBASE_SERVICE_ACCOUNT_JSON"
        value = "ADC"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "NVIDIA_API_BASE_URL"
        value = var.nvidia_api_base_url
      }

      env {
        name  = "NVIDIA_AI_MODEL"
        value = var.nvidia_ai_model
      }

      dynamic "env" {
        for_each = var.nvidia_api_key != "" ? [1] : []
        content {
          name = "NVIDIA_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.nvidia_api_key[0].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.redis_url,
    google_secret_manager_secret_version.nvidia_api_key,
    google_secret_manager_secret_iam_member.api_database_url,
    google_secret_manager_secret_iam_member.api_redis_url,
    google_secret_manager_secret_iam_member.api_nvidia_api_key,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
