variable "project_id" {
  description = "GCP project ID (Decision Log DL: project 'sahyak')"
  type        = string
  default     = "sahyak"
}

variable "region" {
  description = "Binding per Technology Stack table — asia-south1 (Mumbai)"
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Deployment environment name, used to namespace resources"
  type        = string
  default     = "dev"
}

variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run replicas — 2+ from day one per Technology Stack table"
  type        = number
  default     = 2
}

variable "cloud_run_max_instances" {
  type    = number
  default = 10
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-custom-1-3840"
}

variable "redis_memory_size_gb" {
  type    = number
  default = 1
}

variable "api_image" {
  description = "Container image for the API Cloud Run service. Placeholder until CI publishes a real image (Phase 0 exit does not require a real image — see Known Issues)."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "nvidia_api_key" {
  description = "NVIDIA NIM API key for Cloud Run (Secret Manager). Empty skips secret creation."
  type        = string
  sensitive   = true
  default     = ""
}

variable "nvidia_api_base_url" {
  type    = string
  default = "https://integrate.api.nvidia.com/v1"
}

variable "nvidia_ai_model" {
  type    = string
  default = "meta/llama-3.1-8b-instruct"
}
