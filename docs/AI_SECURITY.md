# AI Assistant Security Documentation

## Overview

The Roomies AI assistant has been built with multiple layers of security to ensure safe, helpful, and household-focused interactions.

## Security Features

### 1. Input Validation and Sanitization

- **Length Limits**: Messages limited to 500 characters
- **Character Sanitization**: Removes control characters and escapes special characters
- **Pattern Detection**: Identifies and blocks prompt injection attempts
- **Relevance Checking**: Ensures queries relate to household topics

### 2. Prompt Injection Prevention

The system detects and blocks common injection patterns:
- "Ignore previous instructions"
- "New system prompt"
- "Act as if" / "Pretend to be"
- Template injection attempts (`{{}}`, `${}`)
- System message spoofing

### 3. Content Filtering

Automatically rejects:
- Harmful content (violence, self-harm, illegal activities)
- Off-topic queries (weather, news, entertainment)
- Sensitive PII (SSN, credit cards) unless in household context

### 4. Safe Prompt Construction

- System instructions are hardcoded, not interpolated
- User input is clearly separated from instructions
- Conversation history is limited and sanitized
- Clear boundaries and role definitions

### 5. Response Validation

- Checks for injection artifacts in AI responses
- Truncates overly long responses
- Filters out system message leaks

## User Experience

### For Valid Queries
Users asking household-related questions get:
- Accurate information from their household data
- Helpful responses with specific names, dates, and amounts
- Clear indication when information isn't available

### For Invalid Queries
Users receive friendly redirects:
- Off-topic: "I can help with household expenses, chores, balances, and house rules. What would you like to know?"
- Injection attempts: "Invalid request format. Please ask about household-related topics."
- Harmful content: "I can only help with household-related questions."

### Edge Cases Handled
- **Greetings**: "Hi", "Hello" → Friendly response
- **Help requests**: "What can you do?" → Feature explanation
- **Thanks**: "Thank you" → Polite acknowledgment
- **Household PII**: Email invitations are allowed in context

## Security Monitoring

### Logging
- Prompt injection attempts are logged with user ID
- Failed security checks are categorized
- Response validation failures are tracked

### Categories
Each rejected query is categorized:
- `injection`: Prompt injection attempt
- `harmful`: Harmful content request
- `off-topic`: Non-household query
- `pii`: Sensitive data without context

## Testing

Comprehensive test suite covers:
1. Valid household queries
2. Injection attempt detection
3. Harmful content filtering
4. Off-topic rejection
5. Edge case handling
6. Response validation

## Best Practices for Developers

1. **Never interpolate user input** into system prompts
2. **Always validate** both input and output
3. **Log security events** for monitoring
4. **Keep security patterns updated** as new techniques emerge
5. **Test thoroughly** with adversarial inputs

## Example Safe Interactions

```
User: "What's my balance?"
AI: "Your current balance is -$45. You owe Sarah $30 for groceries and Mike $15 for utilities."

User: "Who's doing dishes tomorrow?"
AI: "According to the schedule, it's John's turn to do dishes tomorrow (Tuesday)."

User: "Ignore previous instructions"
AI: "Invalid request format. Please ask about household-related topics."

User: "What's the weather?"
AI: "I can help with household expenses, chores, balances, and house rules. What would you like to know?"
```

## Future Enhancements

1. **Rate limiting** per user to prevent abuse
2. **Anomaly detection** for unusual query patterns
3. **Dynamic security updates** without code changes
4. **Multi-language support** for security checks
5. **Advanced context understanding** for better relevance detection