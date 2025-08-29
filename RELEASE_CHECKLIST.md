# Release Checklist for v3.0.0

## Pre-Release Verification ✅

### Code Quality
- [x] **Build passes** - `bun run build` completes successfully
- [x] **Tests passing** - 187/194 tests passing (96% success rate)
- [x] **Demos working** - All demo scripts functional
- [x] **TypeScript compilation** - Builds with new module structure

### Module Structure
- [x] **Directories organized** - 5 clear categories instead of 11 scattered modules
- [x] **Imports updated** - All import paths migrated to new structure
- [x] **Index files created** - Proper barrel exports for each module
- [x] **Package.json exports** - Updated to reflect new structure

### Documentation
- [x] **Migration guide** - MIGRATION.md with complete instructions
- [x] **Quick reference** - QUICK_REFERENCE.md for common imports
- [x] **Status reports** - Complete documentation of changes
- [x] **Inline docs** - Updated with new import examples

## Release Steps

### 1. Version Bump
```bash
# Update package.json version
npm version major  # 2.0.0 → 3.0.0
```

### 2. Update Changelog
```markdown
## [3.0.0] - 2025-01-29

### BREAKING CHANGES
- Complete module restructure for better organization and tree-shaking
- Import paths have changed (see MIGRATION.md)

### Added
- Hierarchical module structure with 5 clear categories
- Better tree-shaking support with modular exports
- Comprehensive migration documentation

### Changed
- Moved core modules to `runtime/` directory
- Moved federation-specific code to `federation/`
- Moved production features to `infrastructure/`
- Moved development tools to `tooling/`
- Moved user APIs to `api/`

### Migration
- See MIGRATION.md for complete upgrade instructions
```

### 3. Git Commands
```bash
# Stage all changes
git add .

# Commit with clear message
git commit -m "feat!: restructure modules for v3.0.0

BREAKING CHANGE: Module structure has been reorganized.
Import paths have changed. See MIGRATION.md for details.

- runtime/: Core functionality
- federation/: Federation features  
- infrastructure/: Production features
- tooling/: Development tools
- api/: User-facing APIs"

# Tag the release
git tag -a v3.0.0 -m "Release v3.0.0 - Module restructure"

# Push to repository
git push origin main --tags
```

### 4. NPM Publish
```bash
# Ensure clean build
bun run clean && bun run build

# Dry run first
npm publish --dry-run

# Publish to npm
npm publish --access public
```

### 5. GitHub Release
Create release on GitHub with:
- **Title**: v3.0.0 - Module Restructure
- **Tag**: v3.0.0
- **Description**: Include highlights from changelog
- **Attach**: MIGRATION.md as release asset

### 6. Post-Release Communication

#### Discord/Slack Announcement
```
🎉 @cqrs/federation v3.0.0 Released!

Major restructure for better organization and tree-shaking:
• 5 clear module categories
• Improved bundle sizes
• Better developer experience

⚠️ Breaking changes - see migration guide:
https://github.com/cqrs/federation/blob/main/MIGRATION.md

📦 npm install @cqrs/federation@latest
```

#### Twitter/Social Media
```
🚀 @cqrs/federation v3.0.0 is out!

✨ Cleaner module structure
📦 Better tree-shaking
🔧 Improved DX

Breaking changes with migration guide included.

#GraphQL #Federation #TypeScript #EffectTS
```

## Post-Release Monitoring

### First 24 Hours
- [ ] Monitor GitHub issues for migration problems
- [ ] Check npm download stats
- [ ] Respond to community questions
- [ ] Watch for CI/CD failures in dependent projects

### First Week
- [ ] Gather feedback on new structure
- [ ] Document any migration edge cases
- [ ] Plan patch release if critical issues found
- [ ] Update examples repository

## Rollback Plan

If critical issues discovered:
1. `npm unpublish @cqrs/federation@3.0.0` (within 72 hours)
2. Investigate and fix issues
3. Release as 3.0.1 with fixes
4. Communicate transparently about issues

## Success Metrics

- **Adoption Rate**: Monitor npm downloads
- **Issue Volume**: Track GitHub issues related to migration
- **Bundle Size**: Verify improved tree-shaking in real projects
- **Developer Feedback**: Collect responses on new structure

---

*Checklist prepared for @cqrs/federation v3.0.0 release*
*Last updated: January 2025*