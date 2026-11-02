# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Model & Protections

`music-sheet-enhancer` follows secure coding and input validation best practices:

1. **Defensive Input Sanitization & XSS Prevention**:
   - All user-supplied fields (titles, exercise categories, note letters, student names) are sanitized with HTML entity escaping before injection into SVG/HTML templates.
   - Note keys are validated against strict scientific pitch notation grammar (`^[a-gA-G][b#]?\/[0-8]$`).
   - Clefs are restricted to a whitelist (`treble`, `bass`).

2. **Safe File System Operations**:
   - CLI file path inputs (`--data`, `--out`, `--locale-file`) are resolved using Node's standard `path.resolve` without executing dynamic shells.
   - No untrusted code execution or eval expressions.

3. **Zero Leaked Secrets & Minimal Dependencies**:
   - The runtime relies exclusively on `vexflow` with zero untrusted native binaries.
   - Continuous security vulnerability monitoring via `npm audit --audit-level=high` in CI.

## Reporting a Vulnerability

If you discover a potential security vulnerability in this repository, please report it responsibly:

- Please open a private GitHub Security Advisory at: https://github.com/klkkeio/music-sheet-enhancer/security/advisories/new
- Alternatively, contact the maintainer via GitHub issues for security contact details.
- Please do not report security vulnerabilities through public GitHub issues.

Reports are reviewed promptly and addressed in the next patch release.
