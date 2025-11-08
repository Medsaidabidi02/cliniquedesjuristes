#!/bin/bash

###############################################################################
# Quick Deployment Script for cPanel
# Run this on your LOCAL machine to prepare files for deployment
###############################################################################

set -e  # Exit on error

echo "========================================================================="
echo "Clinique des Juristes - cPanel Deployment Preparation"
echo "========================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    print_error "Error: frontend and backend directories not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

print_success "Found project directories"
echo ""

###############################################################################
# Step 1: Build Frontend
###############################################################################

echo "========================================================================="
echo "Step 1: Building Frontend"
echo "========================================================================="
echo ""

cd frontend

print_info "Installing frontend dependencies..."
npm install

print_info "Building frontend for production..."
npm run build:prod

if [ ! -d "build" ]; then
    print_error "Frontend build failed - build directory not found"
    exit 1
fi

print_success "Frontend built successfully"
echo ""

cd ..

###############################################################################
# Step 2: Build Backend
###############################################################################

echo "========================================================================="
echo "Step 2: Building Backend"
echo "========================================================================="
echo ""

cd backend

print_info "Installing backend dependencies..."
npm install

print_info "Building backend TypeScript to JavaScript..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Backend build failed - dist directory not found"
    exit 1
fi

print_success "Backend built successfully"
echo ""

cd ..

###############################################################################
# Step 3: Create Deployment Package
###############################################################################

echo "========================================================================="
echo "Step 3: Creating Deployment Package"
echo "========================================================================="
echo ""

DEPLOY_DIR="cpanel-deployment"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="clinique-deployment-${TIMESTAMP}"

# Clean up old deployment directory
if [ -d "$DEPLOY_DIR" ]; then
    rm -rf "$DEPLOY_DIR"
fi

mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/backend"
mkdir -p "$DEPLOY_DIR/frontend-files"

print_info "Copying backend files..."
cp -r backend/dist "$DEPLOY_DIR/backend/"
cp -r backend/migrations "$DEPLOY_DIR/backend/"
cp backend/package.json "$DEPLOY_DIR/backend/"
cp backend/package-lock.json "$DEPLOY_DIR/backend/"
cp backend/run-all-migrations.js "$DEPLOY_DIR/backend/"
cp backend/.env.example "$DEPLOY_DIR/backend/.env"

print_success "Backend files copied"

print_info "Copying frontend build files..."
cp -r frontend/build/* "$DEPLOY_DIR/frontend-files/"

print_success "Frontend files copied"

print_info "Copying configuration files..."
cp .htaccess "$DEPLOY_DIR/"
cp DEPLOYMENT_GUIDE.md "$DEPLOY_DIR/"
cp DEPLOYMENT_CHECKLIST.md "$DEPLOY_DIR/"

print_success "Configuration files copied"

###############################################################################
# Step 4: Create Instructions File
###############################################################################

cat > "$DEPLOY_DIR/UPLOAD_INSTRUCTIONS.txt" << 'EOF'
========================================================================
UPLOAD INSTRUCTIONS FOR CPANEL
========================================================================

1. BACKEND FILES:
   Upload the contents of the 'backend' folder to:
   /public_html/backend/
   
   This includes:
   - dist/ (compiled JavaScript)
   - migrations/ (database migrations)
   - package.json
   - package-lock.json
   - run-all-migrations.js
   - .env (MUST be configured with your credentials!)

2. FRONTEND FILES:
   Upload ALL files from 'frontend-files' to:
   /public_html/
   
   This includes:
   - index.html
   - static/ folder
   - manifest.json
   - All other build files

3. CONFIGURATION FILES:
   Upload to /public_html/:
   - .htaccess (MUST be configured with your cPanel username and domain!)

IMPORTANT BEFORE UPLOADING:
---------------------------
1. Edit backend/.env and update:
   - Database credentials (DATABASE_URL)
   - Your domain name (in all URL fields)
   - cPanel username (in paths)

2. Edit .htaccess and update:
   - Your cPanel username (c2668909c -> your_username)
   - Your domain name (cliniquedesjuristes.com -> your_domain.com)
   - Database credentials (in SetEnv DATABASE_URL)

3. After uploading, via SSH:
   cd /home/your_username/public_html/backend
   source /home/your_username/nodevenv/backend/18/bin/activate
   npm install --production
   node run-all-migrations.js
   touch tmp/restart.txt

For complete instructions, see DEPLOYMENT_GUIDE.md

========================================================================
EOF

print_success "Instructions file created"
echo ""

###############################################################################
# Step 5: Create Archive
###############################################################################

print_info "Creating deployment archive..."

if command -v zip &> /dev/null; then
    cd "$DEPLOY_DIR"
    zip -r "../${PACKAGE_NAME}.zip" ./* > /dev/null
    cd ..
    print_success "Deployment archive created: ${PACKAGE_NAME}.zip"
else
    print_info "zip command not found, skipping archive creation"
fi

###############################################################################
# Summary
###############################################################################

echo ""
echo "========================================================================="
echo "DEPLOYMENT PREPARATION COMPLETE"
echo "========================================================================="
echo ""
print_success "All files prepared in: $DEPLOY_DIR/"
echo ""
echo "Next steps:"
echo "1. Review and configure files in $DEPLOY_DIR/"
echo "   - Edit backend/.env with your credentials"
echo "   - Edit .htaccess with your cPanel username and domain"
echo ""
echo "2. Read DEPLOYMENT_GUIDE.md for complete instructions"
echo ""
echo "3. Upload files to your cPanel server:"
echo "   - Backend files -> /public_html/backend/"
echo "   - Frontend files -> /public_html/"
echo "   - .htaccess -> /public_html/"
echo ""
echo "4. Follow DEPLOYMENT_CHECKLIST.md to ensure nothing is missed"
echo ""
print_info "Deployment package ready for upload!"
echo ""
echo "========================================================================="
