# BillsAI AWS Deployment Guide

This guide outlines the steps to deploy BillsAI to AWS securely for production.

## AWS EC2 Setup

1. **Launch an EC2 Instance**:
   - Use Amazon Linux 2023 or Ubuntu Server LTS
   - Choose t3.small or larger depending on expected traffic
   - Enable enhanced networking

2. **Security Group Configuration**:
   - Allow HTTP (80) and HTTPS (443) from anywhere
   - Allow SSH (22) only from your IP address
   - Block all other inbound traffic

3. **Storage Configuration**:
   - At least 20GB EBS volume with gp3 (SSD)
   - Enable encryption for the EBS volume

## SSL/TLS Configuration

1. **Domain Configuration**:
   - Configure DNS records for billsai.org to point to your EC2 instance
   - Set up A record: billsai.org → [Your EC2 Instance IP]
   - Set up A record: api.billsai.org → [Your EC2 Instance IP]

2. **Get SSL Certificate**:
   - Install Certbot: `sudo amazon-linux-extras install epel` then `sudo yum install certbot`
   - Obtain certificate: `sudo certbot --nginx -d billsai.org -d www.billsai.org -d api.billsai.org`
   - Set up auto-renewal: `sudo certbot renew --dry-run`

## Nginx Configuration

```nginx
# /etc/nginx/sites-available/billsai

server {
    listen 80;
    server_name billsai.org www.billsai.org;
    
    # Redirect all HTTP requests to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name billsai.org www.billsai.org;
    
    # SSL configuration from certbot
    ssl_certificate /etc/letsencrypt/live/billsai.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billsai.org/privkey.pem;
    
    # Additional security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; connect-src 'self' api.billsai.org; img-src 'self' data:;" always;
    
    # Website files
    root /var/www/billsai/website;
    index index.html;
    
    # Handle verify-email route for static site
    location = /verify-email {
        try_files $uri /verify-email.html;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    server_name api.billsai.org;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/billsai.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billsai.org/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # API Proxy
    location / {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## MongoDB Configuration

1. **Enable Authentication**:
   - Create a dedicated production MongoDB user
   - Use strong password and restrict permissions

2. **Enable TLS/SSL**:
   - Configure MongoDB Atlas for TLS connections
   - Update connection string to include SSL parameters

3. **Backup Strategy**:
   - Enable daily automated backups (MongoDB Atlas provides this)
   - Set up periodic database exports to S3

## Server Deployment Process

1. **Install Dependencies**:
   ```bash
   sudo yum update -y
   sudo yum install -y nodejs npm git nginx
   ```

2. **Clone Repository**:
   ```bash
   git clone https://your-repository-url.git /var/www/billsai
   cd /var/www/billsai
   ```

3. **Install App Dependencies**:
   ```bash
   npm install --production
   cd server
   npm install --production
   ```

4. **Set Environment Variables**:
   - Copy `.env.production` to `.env`
   - Ensure all secrets are properly set

5. **Deploy Backend**:
   ```bash
   # Install PM2 for process management
   sudo npm install -y pm2 -g
   
   # Start the backend with PM2
   cd /var/www/billsai/server
   pm2 start src/index.js --name "billsai-api"
   pm2 startup
   pm2 save
   ```

6. **Deploy Website**:
   ```bash
   # Copy website files to nginx directory
   cp -R /var/www/billsai/website/* /var/www/html/
   ```

7. **Monitoring Setup**:
   - Set up PM2 monitoring
   - Configure CloudWatch metrics
   - Set up log rotation

## Security Best Practices

1. **Regularly Update Dependencies**:
   ```bash
   npm audit
   npm update
   ```

2. **Implement AWS Security**:
   - Use IAM roles with least privilege
   - Enable VPC for network isolation
   - Enable CloudTrail for API logging
   - Set up CloudWatch alarms

3. **Database Security**:
   - Regular security audits
   - Monitor database access logs
   - Implement database encryption

4. **Application Security**:
   - Regularly rotate API keys and secrets
   - Implement IP-based rate limiting
   - Set up automated security scanning

## Maintenance Plan

1. **Backup Strategy**:
   - Daily automated backups
   - Weekly manual verification
   - Backup recovery testing monthly

2. **Monitoring**:
   - Set up Uptime monitoring
   - Monitor application performance
   - Configure alerts for unusual activities

3. **Update Schedule**:
   - Weekly security patches
   - Monthly dependency updates
   - Quarterly major version updates
