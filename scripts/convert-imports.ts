#!/usr/bin/env bun
/**
 * Import Conversion Script
 * 
 * Converts relative imports to barrel export paths using the @/* path mapping system.
 * This script maintains ESM .js extensions and handles both named and wildcard imports.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

interface ImportReplacement {
  pattern: RegExp
  replacement: string
  description: string
}

// Define import conversion mappings
const IMPORT_REPLACEMENTS: ImportReplacement[] = [
  {
    pattern: /from\s+['"]\.\.\/core\/errors\.js['"]/g,
    replacement: "from '@core'",
    description: 'Convert ../core/errors.js → @core'
  },
  {
    pattern: /from\s+['"]\.\.\/core\/types\.js['"]/g,
    replacement: "from '@core'",
    description: 'Convert ../core/types.js → @core'
  },
  {
    pattern: /from\s+['"]\.\.\/experimental\/ultra-strict-entity-builder\.js['"]/g,
    replacement: "from '@experimental'",
    description: 'Convert ../experimental/ultra-strict-entity-builder.js → @experimental'
  },
  {
    pattern: /from\s+['"]\.\.\/experimental\/index\.js['"]/g,
    replacement: "from '@experimental'",
    description: 'Convert ../experimental/index.js → @experimental'
  }
]

async function getAllTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        files.push(...await getAllTypeScriptFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error)
  }
  
  return files
}

async function convertImportsInFile(filePath: string): Promise<{ modified: boolean; changes: string[] }> {
  try {
    const content = await readFile(filePath, 'utf-8')
    let modifiedContent = content
    const changes: string[] = []
    
    for (const replacement of IMPORT_REPLACEMENTS) {
      const matches = [...content.matchAll(replacement.pattern)]
      
      if (matches.length > 0) {
        modifiedContent = modifiedContent.replace(replacement.pattern, replacement.replacement)
        changes.push(`${replacement.description} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`)
      }
    }
    
    if (changes.length > 0) {
      await writeFile(filePath, modifiedContent, 'utf-8')
      return { modified: true, changes }
    }
    
    return { modified: false, changes: [] }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error)
    return { modified: false, changes: [] }
  }
}

async function main() {
  const srcDir = resolve(process.cwd(), 'src')
  console.log('🔄 Converting relative imports to barrel exports...')
  console.log(`📁 Scanning directory: ${srcDir}`)
  
  const tsFiles = await getAllTypeScriptFiles(srcDir)
  console.log(`📄 Found ${tsFiles.length} TypeScript files`)
  
  let totalModified = 0
  let totalChanges = 0
  
  for (const filePath of tsFiles) {
    const result = await convertImportsInFile(filePath)
    
    if (result.modified) {
      totalModified++
      totalChanges += result.changes.length
      const relativePath = filePath.replace(process.cwd(), '.')
      console.log(`✅ ${relativePath}`)
      for (const change of result.changes) {
        console.log(`   ${change}`)
      }
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   Files processed: ${tsFiles.length}`)
  console.log(`   Files modified: ${totalModified}`)
  console.log(`   Total changes: ${totalChanges}`)
  
  if (totalModified === 0) {
    console.log('✨ No imports needed conversion!')
  } else {
    console.log('✨ Import conversion completed successfully!')
    console.log('\n🔧 Next steps:')
    console.log('   1. Run: bun run typecheck')
    console.log('   2. Run: bun run typecheck:tests')
    console.log('   3. Run: bun test')
    console.log('   4. Run: bun run build')
  }
}

if (import.meta.main) {
  main().catch(console.error)
}