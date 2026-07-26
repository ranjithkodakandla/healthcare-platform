resource "google_redis_instance" "main" {
  name           = "sahayak-${var.environment}-redis"
  region         = var.region
  tier           = "BASIC"
  memory_size_gb = var.redis_memory_size_gb

  authorized_network = google_compute_network.main.id
  connect_mode        = "PRIVATE_SERVICE_ACCESS"
  redis_version       = "REDIS_7_2"

  depends_on = [google_service_networking_connection.private_vpc_connection]
}
