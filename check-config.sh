#!/bin/bash
# Configuration Verification Script
# This script checks if your Hetzner configuration is correctly set up

echo "================================================"
echo "   Hetzner Configuration Verification Tool"
echo "================================================"
echo ""

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Backend .env exists
echo "1. Checking backend/.env file..."
if [ -f "backend/.env" ]; then
    echo -e "   ${GREEN}✓${NC} backend/.env exists"
else
    echo -e "   ${RED}✗${NC} backend/.env does NOT exist"
    echo "      Run: cd backend && cp .env.example .env"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: ENABLE_HETZNER setting
echo ""
echo "2. Checking ENABLE_HETZNER..."
if [ -f "backend/.env" ]; then
    if grep -q "^ENABLE_HETZNER=true" backend/.env; then
        echo -e "   ${GREEN}✓${NC} ENABLE_HETZNER=true"
    else
        echo -e "   ${RED}✗${NC} ENABLE_HETZNER is not set to 'true'"
        echo "      Edit backend/.env and set: ENABLE_HETZNER=true"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 3: HETZNER_ENDPOINT
echo ""
echo "3. Checking HETZNER_ENDPOINT..."
if [ -f "backend/.env" ]; then
    ENDPOINT=$(grep "^HETZNER_ENDPOINT=" backend/.env | cut -d'=' -f2)
    if [ -z "$ENDPOINT" ]; then
        echo -e "   ${RED}✗${NC} HETZNER_ENDPOINT is empty"
        ERRORS=$((ERRORS + 1))
    elif [[ "$ENDPOINT" == *"your-objectstorage.com"* ]]; then
        echo -e "   ${RED}✗${NC} HETZNER_ENDPOINT still has placeholder value"
        echo "      Current: $ENDPOINT"
        echo "      Replace with your actual Hetzner endpoint"
        ERRORS=$((ERRORS + 1))
    elif [[ "$ENDPOINT" == https://* ]]; then
        echo -e "   ${GREEN}✓${NC} HETZNER_ENDPOINT is configured"
        echo "      $ENDPOINT"
    else
        echo -e "   ${YELLOW}⚠${NC} HETZNER_ENDPOINT doesn't start with https://"
        echo "      Current: $ENDPOINT"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 4: HETZNER_BUCKET
echo ""
echo "4. Checking HETZNER_BUCKET..."
if [ -f "backend/.env" ]; then
    BUCKET=$(grep "^HETZNER_BUCKET=" backend/.env | cut -d'=' -f2)
    if [ -z "$BUCKET" ]; then
        echo -e "   ${RED}✗${NC} HETZNER_BUCKET is empty"
        ERRORS=$((ERRORS + 1))
    elif [ "$BUCKET" == "your-bucket-name" ]; then
        echo -e "   ${RED}✗${NC} HETZNER_BUCKET still has placeholder value"
        echo "      Replace with your actual bucket name"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "   ${GREEN}✓${NC} HETZNER_BUCKET is configured"
        echo "      $BUCKET"
    fi
fi

# Check 5: ENABLE_HLS
echo ""
echo "5. Checking ENABLE_HLS..."
if [ -f "backend/.env" ]; then
    if grep -q "^ENABLE_HLS=true" backend/.env; then
        echo -e "   ${GREEN}✓${NC} ENABLE_HLS=true"
    else
        echo -e "   ${YELLOW}⚠${NC} ENABLE_HLS is not set to 'true'"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check 6: Frontend .env
echo ""
echo "6. Checking frontend/.env file..."
if [ -f "frontend/.env" ]; then
    echo -e "   ${GREEN}✓${NC} frontend/.env exists"
    
    API_URL=$(grep "^REACT_APP_API_URL=" frontend/.env | cut -d'=' -f2)
    if [ ! -z "$API_URL" ]; then
        echo "      REACT_APP_API_URL=$API_URL"
    fi
else
    echo -e "   ${YELLOW}⚠${NC} frontend/.env does NOT exist"
    echo "      Run: cd frontend && cp .env.example .env"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 7: Backend running
echo ""
echo "7. Checking if backend is running..."
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Backend is running on port 5001"
    
    # Check 8: Test API response
    echo ""
    echo "8. Testing API response..."
    RESPONSE=$(curl -s http://localhost:5001/api/videos 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "hls_url"; then
        echo -e "   ${GREEN}✓${NC} API returns hls_url field"
        
        # Check if URLs point to Hetzner
        if echo "$RESPONSE" | grep -q "https://.*objectstorage"; then
            echo -e "   ${GREEN}✓${NC} URLs point to Hetzner Object Storage"
            echo ""
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${GREEN}   SUCCESS! Configuration looks good!${NC}"
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo "Your videos should now be pulling from Hetzner."
            echo "Verify in browser DevTools Network tab while playing a video."
        else
            echo -e "   ${RED}✗${NC} URLs do NOT point to Hetzner"
            echo "      Check backend logs for errors"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "   ${RED}✗${NC} API response invalid or missing hls_url"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "   ${YELLOW}⚠${NC} Backend is NOT running"
    echo "      Start it with: cd backend && npm run dev"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "================================================"
echo "                   SUMMARY"
echo "================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start backend: cd backend && npm run dev"
    echo "2. Start frontend: cd frontend && npm start"
    echo "3. Open browser DevTools Network tab"
    echo "4. Play a video and verify .m3u8 requests go to Hetzner"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}Configuration complete with $WARNINGS warnings${NC}"
    echo "Your configuration should work, but please review warnings above."
else
    echo -e "${RED}Found $ERRORS errors and $WARNINGS warnings${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
    echo "See DIAGNOSTIC_GUIDE.md for detailed troubleshooting."
fi

echo ""
echo "================================================"

exit $ERRORS
