# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-01-29

### 🚨 BREAKING CHANGES

This release introduces a complete module restructure for better organization, tree-shaking, and developer experience. All import paths have changed. See [MIGRATION.md](./MIGRATION.md) for detailed upgrade instructions.

### Added

- **Hierarchical Module Structure**: New 5-category organization for clearer separation of concerns
  - `runtime/` - Core functionality always needed at runtime
  - `federation/` - Federation-specific features
  - `infrastructure/` - Production features (resilience, performance)
  - `api/` - User-facing APIs (simple facade, advanced patterns)
  - `tooling/` - Development and deployment tools

- **Improved Tree-Shaking**: Modular exports allow bundlers to exclude unused code
  - Runtime-only builds: ~50KB
  - Full production builds: ~120KB (excluding tooling)
  - Development tools not included in production bundles

- **Migration Documentation**:
  - Comprehensive migration guide (MIGRATION.md)
  - Quick reference for new imports (QUICK_REFERENCE.md)
  - Release checklist for maintainers

### Changed

- **Import Paths** (Breaking):
  - `@cqrs/federation/core` → `@cqrs/federation/runtime`
  - `@cqrs/federation/experimental` → `@cqrs/federation/api/advanced`
  - `@cqrs/federation/facade` → `@cqrs/federation/api/simple`
  - `@cqrs/federation/cli` → `@cqrs/federation/tooling/cli`
  - All internal imports updated to new structure

- **Package Exports**: Reduced from 27 to 21 cleaner, more organized exports
- **Build Configuration**: Updated tsdown and TypeScript configs for new structure
- **Test Organization**: Tests updated to use new import paths

### Fixed

- Circular dependency issues resolved with new structure
- Unclear boundaries between runtime and development code
- Bundle size optimization through better module separation

## [2.0.0] - 2025-08-28

### Changed

- Renamed package from `@cqrs/federation-v2` to `@cqrs/federation`
- Renamed `ModernFederationComposer` to `FederationComposer` throughout codebase
- Updated all documentation to remove v1/v2 migration references
- Removed all legacy and migration-related content
- Updated framework presentation as a mature solution

### Added

- `generateEntityBuilders` method to SchemaFirstService interface
- Proper type safety with `unknown` instead of `any` where possible
- Comprehensive CONTRIBUTING.md guidelines
- CHANGELOG.md for tracking changes

### Fixed

- Schema-first pattern tests now properly generate type definitions
- All TypeScript compilation errors resolved
- Test coverage improved to 76.72%

### Removed

- MIGRATION.md file and all migration guides
- References to "Framework v2" - now just "Federation Framework"
- Broken example file references from package.json
- All "backward compatibility" terminology (replaced with "compatibility")

### Technical Improvements

- Zero TypeScript errors in strict mode
- All 213 tests passing
- Proper Effect-TS patterns throughout
- Comprehensive JSDoc documentation
- TypeDoc generation without warnings
