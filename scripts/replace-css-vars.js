const fs = require('fs');
const path = require('path');

const mappings = {
    'var(--background)': 'var(--bg-base)',
    'var(--surface)': 'var(--bg-surface)',
    'var(--surface-elevated)': 'var(--bg-raised)',
    'var(--border)': 'var(--border-default)',
    'var(--border-strong)': 'var(--border-subtle)',
    'var(--text-muted)': 'var(--text-secondary)',
    'var(--primary)': 'var(--accent-base)',
    'var(--primary-foreground)': 'var(--text-on-accent)',
    'var(--destructive)': 'var(--data-red)',
    'var(--destructive-foreground)': 'var(--text-on-accent)'
};

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const [oldVar, newVar] of Object.entries(mappings)) {
                // We use global replace. We need to escape parenthesis for Regex or just use split/join.
                if (content.includes(oldVar)) {
                    content = content.split(oldVar).join(newVar);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Modified: ${fullPath}`);
            }
        }
    });
}

processDirectory(path.join(__dirname, '../app'));
processDirectory(path.join(__dirname, '../components'));
console.log('Migration complete.');
