# Changelog

All notable changes to this project will be documented in this file.

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
