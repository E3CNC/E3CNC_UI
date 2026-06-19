// .cfg file validator for Klipper configuration files
// Checks syntax, section headers, key=value format, duplicate sections,
// and resolves [include] directives recursively.

export interface CfgValidationError {
    line: number
    message: string
    severity: 'error' | 'warning'
}

interface CfgSection {
    name: string
    startLine: number
}

interface ParseContext {
    errors: CfgValidationError[]
    sections: CfgSection[]
    seenSections: Map<string, number> // section name → first occurrence line
    filePath: string
    visitedFiles: Set<string>
}

/**
 * Validate a .cfg file content with full Klipper-style parsing.
 * @param content - The file content to validate
 * @param fileName - The name of the file (for error messages)
 * @param includeResolver - Optional async function to resolve [include] file contents
 */
export async function validateCfg(
    content: string,
    fileName: string,
    includeResolver?: (path: string) => Promise<string | null>
): Promise<CfgValidationError[]> {
    const ctx: ParseContext = {
        errors: [],
        sections: [],
        seenSections: new Map(),
        filePath: fileName,
        visitedFiles: new Set(),
    }

    ctx.visitedFiles.add(fileName)
    await parseContent(content, ctx, includeResolver)
    return ctx.errors
}

async function parseContent(
    content: string,
    ctx: ParseContext,
    includeResolver?: (path: string) => Promise<string | null>
): Promise<void> {
    const lines = content.split('\n')
    let currentSection: string | null = null
    let currentSectionLine = 0

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i]
        const lineNum = i + 1
        const trimmed = rawLine.trim()

        // Skip empty lines and comments
        if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith(';')) continue

        // Check for section header: [section_name]
        if (trimmed.startsWith('[')) {
            // Validate section header format
            if (!trimmed.endsWith(']')) {
                ctx.errors.push({
                    line: lineNum,
                    message: `Unclosed section header: "${trimmed}". Section headers must end with "]".`,
                    severity: 'error',
                })
                continue
            }

            // Check for content inside brackets
            const sectionName = trimmed.slice(1, -1).trim()
            if (sectionName === '') {
                ctx.errors.push({
                    line: lineNum,
                    message: `Empty section header. Section name is required between brackets.`,
                    severity: 'error',
                })
                continue
            }

            // Check for spaces in section name (Klipper doesn't allow spaces in most section names)
            if (sectionName.includes(' ')) {
                ctx.errors.push({
                    line: lineNum,
                    message: `Section name "${sectionName}" contains spaces. This may cause parsing issues.`,
                    severity: 'warning',
                })
            }

            currentSection = sectionName
            currentSectionLine = lineNum
            ctx.sections.push({ name: sectionName, startLine: lineNum })

            // Check for duplicate sections
            if (ctx.seenSections.has(sectionName.toLowerCase())) {
                const firstLine = ctx.seenSections.get(sectionName.toLowerCase())
                ctx.errors.push({
                    line: lineNum,
                    message: `Duplicate section [${sectionName}] (first defined at line ${firstLine}). Duplicate sections will be merged by Klipper, which may cause unexpected behavior.`,
                    severity: 'error',
                })
            } else {
                ctx.seenSections.set(sectionName.toLowerCase(), lineNum)
            }

            // Handle [include] directives
            if (sectionName.toLowerCase() === 'include') {
                const includePath = getIncludePath(rawLine, lineNum, ctx)
                if (includePath && includeResolver) {
                    // The actual path extraction happens below
                    continue
                }
            }

            continue
        }

        // Check for key=value or key:value format
        if (currentSection === null) {
            ctx.errors.push({
                line: lineNum,
                message: `Content outside of any section: "${truncate(trimmed, 40)}". All configuration must be inside a [section].`,
                severity: 'error',
            })
            continue
        }

        // Check if line looks like a key=value pair
        const eqIdx = trimmed.indexOf('=')
        const colonIdx = trimmed.indexOf(':')

        if (eqIdx === -1 && colonIdx === -1) {
            // This might be a value continuation or an invalid line
            // Check if previous line ended with a continuation marker or if this is a raw value
            const prevLine = i > 0 ? lines[i - 1].trim() : ''
            const prevEndsWithContinuation = prevLine.endsWith('\\') || prevLine.endsWith('"')

            if (!prevEndsWithContinuation && !trimmed.startsWith('"')) {
                ctx.errors.push({
                    line: lineNum,
                    message: `Invalid line format: "${truncate(trimmed, 40)}". Expected key=value.`,
                    severity: 'error',
                })
            }
            continue
        }

        // Validate key part
        const key = eqIdx !== -1 ? trimmed.slice(0, eqIdx).trim() : trimmed.slice(0, colonIdx).trim()
        if (key === '') {
            ctx.errors.push({
                line: lineNum,
                message: `Missing key name before "=": "${truncate(trimmed, 40)}".`,
                severity: 'error',
            })
        }
    }

    // Check for [include] directives - parse raw line for the path
    // We do this in a second pass to keep parsing clean
    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i].trim()
        const lineNum = i + 1
        if (rawLine.startsWith('[include ') || rawLine.toLowerCase().startsWith('[include ') && rawLine.endsWith(']')) {
            // Extract the path between [include and ]
            const withoutBrackets = rawLine.slice(1, -1).trim() // "include path/to/file.cfg"
            const parts = withoutBrackets.split(/\s+/)
            if (parts.length >= 2) {
                const includePath = parts.slice(1).join(' ').replace(/^["']|["']$/g, '')
                if (includeResolver) {
                    try {
                        const includedContent = await includeResolver(includePath)
                        if (includedContent !== null) {
                            const includeFileName = includePath.split('/').pop() || includePath
                            if (!ctx.visitedFiles.has(includeFileName)) {
                                ctx.visitedFiles.add(includeFileName)
                                const subCtx: ParseContext = {
                                    errors: ctx.errors,
                                    sections: ctx.sections,
                                    seenSections: ctx.seenSections,
                                    filePath: includeFileName,
                                    visitedFiles: ctx.visitedFiles,
                                }
                                await parseContent(includedContent, subCtx, includeResolver)
                            }
                        } else {
                            ctx.errors.push({
                                line: lineNum,
                                message: `Included file not found: "${includePath}".`,
                                severity: 'warning',
                            })
                        }
                    } catch {
                        ctx.errors.push({
                            line: lineNum,
                            message: `Error reading included file: "${includePath}".`,
                            severity: 'warning',
                        })
                    }
                }
            }
        }
    }
}

function getIncludePath(rawLine: string, lineNum: number, ctx: ParseContext): string | null {
    // Extract path from: [include path/to/file.cfg]
    const match = rawLine.match(/^\[include\s+(.+?)\]$/i)
    if (match) {
        return match[1].replace(/^["']|["']$/g, '')
    }
    return null
}

function truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}
