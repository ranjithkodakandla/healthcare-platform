resource "google_compute_network" "main" {
  name                    = "sahayak-${var.environment}-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.required]
}

resource "google_compute_subnetwork" "main" {
  name          = "sahayak-${var.environment}-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# Private IP range for Cloud SQL / Memorystore VPC peering
resource "google_compute_global_address" "private_ip_range" {
  name          = "sahayak-${var.environment}-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.required]
}

# Serverless VPC Access connector so Cloud Run can reach the private IPs above
resource "google_vpc_access_connector" "main" {
  name          = "sahayak-${var.environment}-connector"
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = "10.10.1.0/28"

  depends_on = [google_project_service.required]
}
