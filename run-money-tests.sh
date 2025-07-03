#!/bin/bash

echo "🏦 Running Money Feature Tests..."
echo "================================"

# Install dependencies if needed
if ! command -v tsx &> /dev/null; then
    echo "Installing required dependencies..."
    npm install --save-dev tsx chalk ora
fi

# Run the comprehensive test runner
echo ""
echo "Running comprehensive test suite..."
npm run test:money

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "Next steps:"
    echo "1. Apply the database migration: psql -f supabase/fix_expense_editing.sql"
    echo "2. Test the expense editing flow manually"
    echo "3. Verify that settled expenses can be edited with proper warnings"
else
    echo ""
    echo "❌ Some tests failed. Please review the errors above."
    echo ""
    echo "To fix the issues, run:"
    echo "npm run fix:money"
fi