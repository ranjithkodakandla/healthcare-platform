resource "google_secret_manager_secret" "database_url" {
  secret_id = "sahayak-${var.environment}-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${google_sql_user.app.name}:${random_password.db_password.result}@${google_sql_database_instance.main.private_ip_address}:5432/${google_sql_database.main.name}"
}

resource "google_secret_manager_secret" "redis_url" {
  secret_id = "sahayak-${var.environment}-redis-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"
}

resource "google_secret_manager_secret" "nvidia_api_key" {
  count     = var.nvidia_api_key != "" ? 1 : 0
  secret_id = "sahayak-${var.environment}-nvidia-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "nvidia_api_key" {
  count       = var.nvidia_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.nvidia_api_key[0].id
  secret_data = var.nvidia_api_key
}
