variable "aws_region" {
  description = "AWS region for the VPC and EKS cluster"
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "EKS cluster name (CI deploys to this name)"
  type        = string
  default     = "stockdesk-eks"
}

variable "cluster_version" {
  description = "Kubernetes version; keep it in EKS standard support to avoid extended-support pricing"
  type        = string
  default     = "1.34"
}

variable "environment" {
  description = "Environment tag applied to every resource"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "node_instance_types" {
  description = "Instance types for the managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}
