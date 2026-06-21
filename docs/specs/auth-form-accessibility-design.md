# Design Document: Auth Form Accessibility Improvements

## Overview

This design focuses on improving the user experience and accessibility of authentication forms by enhancing placeholder text, maintaining proper label-placeholder relationships, and ensuring WCAG compliance. The improvements will be applied to both login and signup forms to maintain consistency across the authentication flow.

## Architecture

### Component Structure

The changes will be isolated to the form components without requiring architectural modifications:

- `src/components/auth/login-form.tsx` - Login form component
- `src/components/auth/signup-form.tsx` - Signup form component

Both components use the same UI primitives (`Input`, `Button`, `FormError`) ensuring consistent styling and behavior.

### Accessibility Principles Applied

1. **Labels are not placeholders**: Labels remain visible and provide context; placeholders provide examples
2. **Descriptive examples**: Placeholders demonstrate expected format rather than repeating the label
3. **Plain language**: Avoid technical jargon in user-facing text
4. **Contrast compliance**: Ensure placeholder text meets WCAG AA standards (already handled by Input component)
5. **Mobile-friendly**: Maintain readability and touch target sizes on all devices

## Components and Interfaces

### Input Field Enhancement Pattern

Each form field follows this structure:

```tsx
<div className="space-y-2">
  <label htmlFor="fieldId" className="text-sm font-medium">
    {/* Clear, descriptive label */}
  </label>
  <Input
    id="fieldId"
    type="..."
    placeholder="..." // Improved placeholder with example
    value={value}
    onChange={handler}
    disabled={loading}
    required
    aria-invalid={hasError}
    aria-describedby="fieldId-description" // Optional for additional context
  />
</div>
```

### Placeholder Text Guidelines

**Email Field:**
- Current: `"you@example.com"`
- Improved: `"name@company.com"` or `"your.email@example.com"`
- Rationale: More realistic example that shows common email patterns

**Password Field (Login):**
- Current: `"••••••••"` (8 bullets)
- Improved: `"Enter your password"`
- Rationale: Bullets don't provide useful information; descriptive text is clearer

**Password Field (Signup):**
- Current: `"••••••••"`
- Improved: `"At least 6 characters"`
- Rationale: Communicates the password requirement upfront

**Confirm Password Field:**
- Current: `"••••••••"`
- Improved: `"Re-enter your password"`
- Rationale: Clarifies the purpose of the field

## Data Models

No data model changes required. This is a presentation-layer enhancement.

## Error Handling

### Existing Error Handling (Maintained)

- Form-level errors displayed via `FormError` component
- Field-level validation via `aria-invalid` attribute
- Password validation errors in signup form
- Auth store errors for authentication failures

### Enhanced Error Context

When errors occur, the improved placeholders provide better context for users to understand what went wrong:

- Clear examples help users identify format issues
- Descriptive placeholders reduce confusion about field purpose

## Testing Strategy

### Manual Testing Checklist

1. **Visual Testing**
   - Verify placeholder text is readable in both light and dark modes
   - Confirm placeholders disappear when user starts typing
   - Check mobile responsiveness (320px to 768px viewports)
   - Validate touch target sizes (minimum 44px height)

2. **Screen Reader Testing**
   - Test with NVDA/JAWS (Windows) or VoiceOver (Mac)
   - Verify labels are announced before placeholders
   - Confirm error messages are properly associated with fields
   - Check focus order is logical

3. **Keyboard Navigation**
   - Tab through all form fields
   - Verify focus indicators are visible
   - Test form submission with Enter key

4. **Cross-Browser Testing**
   - Chrome, Firefox, Safari, Edge
   - Verify placeholder styling is consistent

### Accessibility Validation

- Run axe DevTools or WAVE to check for WCAG violations
- Verify color contrast ratios meet WCAG AA standards
- Confirm all form fields have associated labels
- Check that placeholder text doesn't replace labels

## Implementation Notes

### Minimal Changes Required

The implementation requires only updating the `placeholder` prop values in the Input components. No structural changes to the forms are needed.

### Consistency Across Forms

Both login and signup forms will follow the same placeholder patterns:
- Email: Realistic example format
- Password: Descriptive text instead of bullets
- Confirm Password: Clear instruction

### Backward Compatibility

These changes are purely presentational and don't affect:
- Form validation logic
- Authentication flow
- State management
- API interactions

### Future Enhancements (Out of Scope)

- Password strength indicator
- Real-time validation feedback
- Inline help text or tooltips
- Progressive disclosure for password requirements
