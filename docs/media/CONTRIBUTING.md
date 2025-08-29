# Contributing to Federation Framework v2

Thank you for your interest in contributing to Federation Framework v2! This document provides guidelines for contributing to the project.

## 🚀 Quick Start for Contributors

### Prerequisites

- **Node.js**: 18+ or Bun runtime
- **TypeScript**: 5.9+
- **Git**: Latest version

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/cqrs/federation.git
cd federation

# Install dependencies
bun install

# Run tests to ensure everything works
bun test

# Start development mode
bun run dev
```

## 🧪 Development Workflow

### Running Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun test:unit                    # Unit tests only
bun test:integration             # Integration tests only
bun test:coverage                # Generate coverage reports
bun test --watch                 # Tests in watch mode

# Run complete validation
bun run validate                 # TypeScript + tests
```

### Code Quality

```bash
# Type checking
bun run typecheck

# Linting
bun run lint                     # Check for issues
bun run lint:fix                 # Fix automatically

# Formatting
bun run format                   # Format code
bun run format:check             # Check formatting
```

### Building & Documentation

```bash
# Build the project
bun run build                    # Production build
bun run build:watch              # Development build with watch

# Generate documentation
bun run docs:generate            # TypeDoc API documentation
```

## 📝 Code Standards

### TypeScript Guidelines

- **Strict Mode**: Always use TypeScript strict mode
- **No `any` Types**: Use proper type assertions or `unknown`
- **Effect-TS Patterns**: All async operations must use Effect.Effect
- **Exhaustive Pattern Matching**: Use Match.exhaustive for error handling

### JSDoc Documentation

Follow the established patterns found in high-quality files:

````typescript
/**
 * Brief description of the function/class.
 *
 * Detailed description with more context and usage information.
 *
 * @example
 * ```typescript
 * // Basic usage example
 * const result = await myFunction(input)
 * ```
 *
 * @example Advanced usage
 * ```typescript
 * // Advanced scenario showing more complex usage
 * const advancedResult = await myFunction(complexInput, options)
 * ```
 *
 * @param input - Description of the input parameter
 * @param options - Optional configuration object
 * @returns Promise resolving to the result
 * @throws {ValidationError} When input validation fails
 * @see {@link RelatedFunction} for related functionality
 * @since v2.0.0
 * @category Core API
 */
````

### Error Handling Patterns

```typescript
// ✅ DO: Use discriminated unions for errors
type DomainError = ValidationError | FederationError | CompositionError

// ✅ DO: Use Effect patterns
const validateEntity = (data: unknown): Effect.Effect<Entity, ValidationError> =>
  Effect.gen(function* () {
    // validation logic
  })

// ✅ DO: Use exhaustive pattern matching
const handleError = (error: DomainError) =>
  Match.value(error).pipe(
    Match.tag('ValidationError', handleValidation),
    Match.tag('FederationError', handleFederation),
    Match.exhaustive
  )
```

## 🎯 Contribution Guidelines

### Pull Request Process

1. **Fork** the repository and create your feature branch from `main`
2. **Write tests** for new functionality
3. **Update documentation** including JSDoc comments
4. **Run the full test suite** and ensure all checks pass
5. **Submit a pull request** with a clear title and description

### Commit Message Format

```
type(scope): brief description

Detailed description of the changes made.

- Key change 1
- Key change 2
- Key change 3
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Testing Requirements

- **Unit Tests**: All new functions must have unit tests
- **Integration Tests**: Complex features need integration tests
- **Type Safety**: All code must pass TypeScript strict mode
- **Coverage**: Maintain >90% code coverage

### Documentation Requirements

- **JSDoc**: All public APIs must have comprehensive JSDoc
- **Examples**: Include working code examples in documentation
- **README Updates**: Update README.md for significant features
- **TypeDoc**: Ensure TypeDoc generation succeeds without warnings

## 🔍 Code Review Criteria

### Functionality

- Code works correctly and handles edge cases
- Performance considerations are addressed
- Error handling follows established patterns

### Code Quality

- Follows TypeScript strict mode requirements
- Uses Effect-TS patterns consistently
- No `any` types in public interfaces
- Proper error handling with discriminated unions

### Testing

- Comprehensive test coverage
- Tests use proper Effect patterns
- Integration tests for complex scenarios

### Documentation

- Complete JSDoc for all public APIs
- Clear examples and usage patterns
- Updated README if needed

## 🛡️ Security Guidelines

- **Input Validation**: Always validate inputs using Effect Schema
- **Error Information**: Don't leak sensitive data in error messages
- **Dependencies**: Keep dependencies updated and secure
- **Review**: Security-sensitive changes require additional review

## 📖 Resources

- **[Effect-TS Documentation](https://effect.website/)**: Learn Effect patterns
- **[Apollo Federation Docs](https://www.apollographql.com/docs/federation/)**: Federation concepts
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)**: TypeScript best practices
- **[Project Documentation](https://federation-docs.netlify.app/)**: API reference

## 💬 Getting Help

- **🐛 Issues**: [GitHub Issues](https://github.com/cqrs/federation/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/cqrs/federation/discussions)
- **📧 Email**: [contributors@cqrs-federation.dev](mailto:contributors@cqrs-federation.dev)

## 📄 License

By contributing to Federation Framework v2, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Federation Framework v2! 🎉
