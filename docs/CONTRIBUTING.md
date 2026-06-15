# Contributing to LexInSight

Thank you for your interest in contributing to LexInSight! This document provides guidelines and instructions for contributing to the project.

## 🌟 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [issue tracker](https://github.com/Iron-Mark/Hackathon-LexInsights/issues) to avoid duplicates.

**When reporting bugs, include:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots or error messages
- Your environment (OS, browser, Node.js version)
- Relevant code snippets

**Example Bug Report:**
```markdown
**Bug Description:** File upload fails for PDF files larger than 3MB

**Steps to Reproduce:**
1. Navigate to chat interface
2. Switch to Compliance Mode
3. Upload a 4MB PDF file
4. Click send

**Expected:** File should upload successfully (limit is 5MB)
**Actual:** Upload fails with "File too large" error

**Environment:**
- OS: Windows 11
- Browser: Chrome 120
- Node.js: 18.17.0
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear, descriptive title
- Provide detailed explanation of the suggested enhancement
- Explain why this enhancement would be useful
- Include mockups or examples if applicable

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Hackathon-LexInsights.git
   cd Hackathon-LexInsights/lexiph
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Your Changes**
   - Follow the code style guidelines
   - Write meaningful commit messages
   - Add tests if applicable
   - Update documentation

4. **Test Your Changes**
   ```bash
   npm run check:local
   ```

   `npm run check:local` runs the sequential local gate: zero-warning lint, TypeScript, production audit, Markdown link checker self-test, Markdown link check, readiness self-test, deployment preflight self-test, live deployment self-test, RAG proxy self-test, production build, and Playwright smoke.

   Run `npm run check:readiness` only when Supabase and RAG environment values point to reachable services. It is the backend E2E readiness gate, not a generic offline test. After production deploys, run `npm run check:deployment -- --base-url https://lexiph.vercel.app`, then `npm run check:live -- --base-url https://lexiph.vercel.app` to confirm the public app serves the expected commit before checking live backend behavior. If Vercel linkage is unclear, rerun the preflight with `--with-vercel-cli --discover-vercel-scopes`, and add `--vercel-scope marksiazon-dev` when checking the team scope.

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use meaningful variable and function names

```typescript
// ✅ Good
interface UserProfile {
  id: string
  email: string
  fullName: string
}

const getUserProfile = async (userId: string): Promise<UserProfile> => {
  // implementation
}

// ❌ Bad
const getUser = async (id: any): Promise<any> => {
  // implementation
}
```

### React Components

- Use functional components with hooks
- Extract complex logic into custom hooks
- Keep components small and focused
- Use proper prop typing

```typescript
// ✅ Good
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  )
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `ChatContainer.tsx`)
- Utilities: `kebab-case.ts` (e.g., `format-date.ts`)
- Hooks: `use-*.ts` (e.g., `use-auth.ts`)
- Types: `types.ts` or `index.ts` in types folder

### CSS/Tailwind

- Use Tailwind utility classes
- Follow mobile-first responsive design
- Extract repeated patterns into components
- Use CSS modules for complex styles

```tsx
// ✅ Good - Mobile first
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
  {/* content */}
</div>

// ❌ Bad - Desktop first
<div className="flex flex-row gap-6 md:flex-col md:gap-4">
  {/* content */}
</div>
```

## 🧪 Testing Guidelines

### Unit Tests

- Write tests for utility functions
- Test edge cases and error handling
- Use descriptive test names

```typescript
describe('formatFileSize', () => {
  it('should format bytes to KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
  })

  it('should format bytes to MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('should handle zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })
})
```

### Integration Tests

- Test component interactions
- Mock external dependencies
- Test user workflows

## 🔀 Git Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(chat): add file upload progress indicator

- Display upload percentage
- Show cancel button during upload
- Add error handling for failed uploads

Closes #123
```

```bash
fix(auth): resolve login redirect issue

Users were not being redirected after successful login.
This fixes the redirect logic in the auth callback.

Fixes #456
```

## 🏗️ Project Structure

When adding new features, follow this structure:

```
lexiph/
├── app/                    # Next.js pages
│   ├── (feature)/         # Feature group
│   │   ├── page.tsx      # Main page
│   │   └── layout.tsx    # Feature layout
│   └── api/              # API routes
│       └── [feature]/    # API endpoints
├── components/            # React components
│   ├── [feature]/        # Feature components
│   │   ├── ComponentName.tsx
│   │   └── index.ts      # Barrel export
│   └── ui/               # Reusable UI components
├── lib/                   # Utilities
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utility functions
│   ├── store/            # State management
│   └── services/         # API services
└── types/                 # TypeScript types
```

## 📚 Documentation

### Code Comments

- Write self-documenting code
- Add comments for complex logic
- Document public APIs
- Use JSDoc for functions

```typescript
/**
 * Uploads a file to Supabase storage
 *
 * @param file - The file to upload
 * @param userId - The user's ID for storage path
 * @param chatId - Optional chat ID for organization
 * @returns Promise with uploaded file metadata
 * @throws Error if upload fails
 */
export async function uploadFile(
  file: File,
  userId: string,
  chatId?: string
): Promise<FileMetadata> {
  // implementation
}
```

### README Updates

When adding features, update relevant sections:
- Features list
- Usage guide
- API documentation
- Configuration options

## 🎯 Priority Areas

We especially welcome contributions in these areas:

### High Priority
- 🐛 Bug fixes
- 📱 Mobile responsiveness improvements
- ♿ Accessibility enhancements
- 🔒 Security improvements
- 📝 Documentation improvements

### Medium Priority
- ✨ New features from roadmap
- 🎨 UI/UX improvements
- ⚡ Performance optimizations
- 🧪 Test coverage

### Nice to Have
- 🌐 Internationalization (Filipino language)
- 🎨 Theme customization
- 📊 Analytics integration
- 🔌 Plugin system

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Give constructive feedback
- Help others learn

### Communication

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code contributions, reviews
- **Discussions**: Questions, ideas, general chat

### Getting Help

If you need help:
1. Check existing documentation
2. Search closed issues
3. Ask in GitHub Discussions
4. Tag maintainers if urgent

## 🏆 Recognition

Contributors will be:
- Listed in README.md
- Credited in release notes
- Given contributor badge

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making LexInSight better! 🎉**
