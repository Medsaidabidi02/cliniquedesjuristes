#!/bin/bash

###############################################################################
# Deployment Verification Script
# Run this on cPanel server via SSH after deployment
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}=========================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=========================================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Track errors
ERRORS=0
WARNINGS=0

print_header "cPanel Deployment Verification"

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    print_error "backend directory not found"
    print_info "Please run this script from public_html directory"
    exit 1
fi

print_success "Found backend directory"

###############################################################################
# Check Backend Files
###############################################################################

print_header "Checking Backend Files"

if [ -d "backend/dist" ]; then
    print_success "backend/dist directory exists"
    
    if [ -f "backend/dist/server.js" ]; then
        print_success "backend/dist/server.js exists"
    else
        print_error "backend/dist/server.js not found"
        ((ERRORS++))
    fi
else
    print_error "backend/dist directory not found"
    print_info "Did you upload the compiled backend code?"
    ((ERRORS++))
fi

if [ -d "backend/migrations" ]; then
    print_success "backend/migrations directory exists"
    MIGRATION_COUNT=$(ls -1 backend/migrations/*.sql 2>/dev/null | wc -l)
    print_info "Found $MIGRATION_COUNT migration file(s)"
else
    print_warning "backend/migrations directory not found"
    ((WARNINGS++))
fi

if [ -f "backend/.env" ]; then
    print_success "backend/.env file exists"
    
    # Check important env vars
    if grep -q "NODE_ENV=production" backend/.env; then
        print_success "NODE_ENV is set to production"
    else
        print_error "NODE_ENV is not set to production"
        ((ERRORS++))
    fi
    
    if grep -q "DATABASE_URL=mysql://" backend/.env; then
        print_success "DATABASE_URL is configured"
    else
        print_error "DATABASE_URL not found in .env"
        ((ERRORS++))
    fi
else
    print_error "backend/.env file not found"
    ((ERRORS++))
fi

if [ -f "backend/package.json" ]; then
    print_success "backend/package.json exists"
else
    print_error "backend/package.json not found"
    ((ERRORS++))
fi

###############################################################################
# Check Frontend Files
###############################################################################

print_header "Checking Frontend Files"

if [ -f "index.html" ]; then
    print_success "index.html exists in public_html"
else
    print_error "index.html not found in public_html"
    print_info "Frontend build files should be in public_html root, not in a subfolder"
    ((ERRORS++))
fi

if [ -d "static" ]; then
    print_success "static directory exists"
    
    if [ -d "static/js" ] && [ -d "static/css" ]; then
        print_success "static/js and static/css directories exist"
    else
        print_warning "static/js or static/css directory not found"
        ((WARNINGS++))
    fi
else
    print_error "static directory not found"
    print_info "Frontend build files should include a 'static' folder"
    ((ERRORS++))
fi

###############################################################################
# Check Configuration Files
###############################################################################

print_header "Checking Configuration Files"

if [ -f ".htaccess" ]; then
    print_success ".htaccess file exists"
    
    if grep -q "PassengerAppRoot" .htaccess; then
        print_success ".htaccess has Passenger configuration"
    else
        print_error ".htaccess missing Passenger configuration"
        ((ERRORS++))
    fi
    
    if grep -q "RewriteEngine On" .htaccess; then
        print_success ".htaccess has RewriteEngine enabled"
    else
        print_warning ".htaccess missing RewriteEngine directive"
        ((WARNINGS++))
    fi
else
    print_error ".htaccess file not found"
    ((ERRORS++))
fi

###############################################################################
# Check Permissions
###############################################################################

print_header "Checking File Permissions"

HTACCESS_PERMS=$(stat -c "%a" .htaccess 2>/dev/null || stat -f "%A" .htaccess 2>/dev/null || echo "unknown")
if [ "$HTACCESS_PERMS" = "644" ]; then
    print_success ".htaccess permissions correct (644)"
else
    print_warning ".htaccess permissions: $HTACCESS_PERMS (should be 644)"
    ((WARNINGS++))
fi

if [ -f "backend/.env" ]; then
    ENV_PERMS=$(stat -c "%a" backend/.env 2>/dev/null || stat -f "%A" backend/.env 2>/dev/null || echo "unknown")
    if [ "$ENV_PERMS" = "644" ] || [ "$ENV_PERMS" = "600" ]; then
        print_success "backend/.env permissions correct ($ENV_PERMS)"
    else
        print_warning "backend/.env permissions: $ENV_PERMS (should be 644 or 600)"
        ((WARNINGS++))
    fi
fi

###############################################################################
# Check Node.js Environment
###############################################################################

print_header "Checking Node.js Environment"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
    
    # Check if version is 18 or higher
    VERSION_NUM=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    if [ "$VERSION_NUM" -ge 18 ]; then
        print_success "Node.js version is 18 or higher"
    else
        print_warning "Node.js version is less than 18"
        ((WARNINGS++))
    fi
else
    print_warning "Node.js not in PATH (activate virtual environment first)"
    print_info "Run: source ~/nodevenv/backend/18/bin/activate"
    ((WARNINGS++))
fi

if [ -d "backend/node_modules" ]; then
    print_success "backend/node_modules directory exists"
    
    # Check for critical dependencies
    if [ -d "backend/node_modules/express" ]; then
        print_success "express is installed"
    else
        print_error "express not found in node_modules"
        ((ERRORS++))
    fi
    
    if [ -d "backend/node_modules/mysql2" ]; then
        print_success "mysql2 is installed"
    else
        print_error "mysql2 not found in node_modules"
        ((ERRORS++))
    fi
else
    print_error "backend/node_modules not found"
    print_info "Run: cd backend && npm install --production"
    ((ERRORS++))
fi

###############################################################################
# Check Database Connection (if mysql client available)
###############################################################################

print_header "Checking Database Access"

if command -v mysql &> /dev/null; then
    print_success "MySQL client is available"
    
    # Try to extract database credentials from .env
    if [ -f "backend/.env" ]; then
        DB_URL=$(grep "^DATABASE_URL=" backend/.env | cut -d= -f2)
        if [ -n "$DB_URL" ]; then
            print_info "Database URL found in .env"
            print_info "You can test connection manually with mysql command"
        fi
    fi
else
    print_warning "MySQL client not available in PATH"
    print_info "Cannot test database connection automatically"
    ((WARNINGS++))
fi

###############################################################################
# Summary
###############################################################################

print_header "Verification Summary"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_success "All checks passed! ✅"
    echo ""
    echo "Next steps:"
    echo "1. Restart the application: touch backend/tmp/restart.txt"
    echo "2. Test API health: curl https://yourdomain.com/api/health"
    echo "3. Visit your website and test functionality"
elif [ $ERRORS -eq 0 ]; then
    print_success "No critical errors found ✅"
    print_warning "$WARNINGS warning(s) found ⚠️"
    echo ""
    echo "Review warnings above and fix if needed"
    echo "Then restart: touch backend/tmp/restart.txt"
else
    print_error "$ERRORS error(s) found ❌"
    print_warning "$WARNINGS warning(s) found ⚠️"
    echo ""
    echo "Please fix the errors above before continuing"
    echo "See DEPLOYMENT_GUIDE.md for detailed instructions"
    exit 1
fi

echo ""
print_header "Additional Checks to Perform Manually"
echo "1. Test API health:"
echo "   curl https://yourdomain.com/api/health"
echo ""
echo "2. Check Passenger logs:"
echo "   tail -f ~/logs/passenger.log"
echo ""
echo "3. Run database migrations (if not already done):"
echo "   cd backend && node run-all-migrations.js"
echo ""
echo "4. Test website in browser:"
echo "   https://yourdomain.com"
echo ""
echo "5. Test admin login with credentials from backend/.env"
echo ""

exit 0
