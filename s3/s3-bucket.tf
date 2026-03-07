resource "aws_s3_bucket" "terraform_state" {
  bucket = "terraform-state-tc5-g192-athena-v1"
  tags = {
    Name = "Terraform State"
  }
}

resource "aws_s3_bucket" "videos_directory" {
  bucket = "athena-videos-tc5-g192-v1"
  tags = {
    Name = "Videos Directory"
  }
}
