const fs = require('fs');
const path = require('path');

// Patterns that must NOT appear in client-accessible files
const BAD_PATTERNS = [
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SUPABASE_SERVICE_KEY/i,
    /service_role/i,
    /SERVICE_ROLE/i,
    /service-role/i,
];

// Paths to ignore (server-side code and infra docs are allowed to reference service role)
const IGNORED_PATH_PREFIXES = [
    'server/',
    'scripts/',
    'tests/',
    '.github/',
    'supabase-',
];

const workspaceRoot = path.resolve(__dirname, '..');

function isIgnored(filePath) {
    const rel = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
    for (const p of IGNORED_PATH_PREFIXES) {
        if (rel.startsWith(p)) return true;
    }
    // also allow SQL and markdown to mention service_role
    if (rel.endsWith('.sql') || rel.endsWith('.md')) return true;
    return false;
}

function walk(dir, callback) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            walk(full, callback);
        } else {
            callback(full);
        }
    }
}

const offenders = [];
walk(workspaceRoot, (filePath) => {
    if (isIgnored(filePath)) return;
    // only check text files likely to be client assets
    const ext = path.extname(filePath).toLowerCase();
    const checkExts = ['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.html', '.css', '.json'];
    if (!checkExts.includes(ext)) return;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pat of BAD_PATTERNS) {
            if (pat.test(content)) {
                offenders.push({ file: path.relative(workspaceRoot, filePath), pattern: pat.toString() });
                break;
            }
        }
    } catch (err) {
        // ignore binary or unreadable files
    }
});

if (offenders.length > 0) {
    console.error('\nERROR: Found server-only secret patterns in client-accessible files:');
    for (const o of offenders) {
        console.error(` - ${o.file} (matched ${o.pattern})`);
    }
    console.error('\nRemove these references or move them to server-only environment variables before deploying to production.');
    process.exit(1);
}

console.log('OK: No client-side service-role secret patterns found.');
process.exit(0);
