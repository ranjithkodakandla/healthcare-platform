resource "google_artifact_registry_repository" "api" {
  location      = var.region
  repository_id = "sahayak-${var.environment}"
  description   = "Sahayak container images (${var.environment})"
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}
