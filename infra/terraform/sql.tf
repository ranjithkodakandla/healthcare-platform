resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "main" {
  name             = "sahayak-${var.environment}-pg"
  database_version = "POSTGRES_16"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"

    ip_configuration {
      # Private IP for Cloud Run (VPC connector). Public IP for Cloud SQL Auth Proxy
      # so prisma migrate can run from a laptop (ISSUE-001 first deploy).
      ipv4_enabled                                  = true
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "main" {
  name     = "sahayak"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "sahayak"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}

# Read replica — required by Infrastructure Progress ("+ read replica (GT-11 fallback)")
resource "google_sql_database_instance" "replica" {
  count = var.environment == "production" ? 1 : 0

  name                 = "sahayak-${var.environment}-pg-replica"
  master_instance_name = google_sql_database_instance.main.name
  database_version     = "POSTGRES_16"
  region               = var.region

  replica_configuration {
    failover_target = false
  }

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }
  }
}
