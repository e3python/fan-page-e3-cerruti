const fs = require('fs');
const cheerio = require('cheerio');
const chalk = require('chalk');

// --- Configuration ---
const FILE_PATH = 'index.html';

// --- Rubric Scores ---
let score = 0;
const MAX_SCORE = 12; // Adjusted to match your rubric (approx)
const feedback = [];

// --- Helper Functions ---
function logResult(category, passed, msg, points = 0) {
    const icon = passed ? '✅' : '❌';
    const color = passed ? chalk.green : chalk.red;
    if (passed) score += points;
    console.log(`${icon} ${chalk.bold(category)}: ${color(msg)}`);
    feedback.push({ category, passed, msg });
}

try {
    // 1. Check if file exists
    if (!fs.existsSync(FILE_PATH)) {
        console.log(chalk.red('❌ FATAL: index.html not found!'));
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(FILE_PATH, 'utf8');
    const $ = cheerio.load(htmlContent);

    console.log(chalk.blue.bold('\n🤖 Auto-Grader Report for HTML Fan Page\n' + '='.repeat(40)));

    // --- CRITERIA 1: HTML STRUCTURE & SEMANTICS (Rubric Row 1) ---
    // Goal: 3+ different tags, Hierarchy
    const tagsToCheck = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li'];
    const usedTags = tagsToCheck.filter(tag => $(tag).length > 0);
    
    if (usedTags.length >= 3) {
        logResult('Structure', true, `Great job! You used ${usedTags.length} different types of tags.`, 3);
    } else {
        logResult('Structure', false, `You only used ${usedTags.length} tag types. Try adding lists or headers!`, 1);
    }

    // Check Hierarchy (H1 exists)
    if ($('h1').length === 1) {
        logResult('Hierarchy', true, 'Perfect! You have exactly one main title (H1).', 0); // Integrated into Structure score logic usually, keeping separate for feedback
    } else if ($('h1').length > 1) {
        logResult('Hierarchy', false, 'Warning: You generally only want ONE H1 tag per page.', 0);
    } else {
        logResult('Hierarchy', false, 'Missing an <h1> tag for your main title.', 0);
    }

    // --- CRITERIA 2: CODE HYGIENE (Rubric Row 2) ---
    // Goal: Comments <!-- -->
    const commentRegex = /<!--[\s\S]*?-->/g;
    const hasComments = commentRegex.test(htmlContent);

    if (hasComments) {
        logResult('Code Hygiene', true, 'Comments found! Good job documenting your sections.', 3);
    } else {
        logResult('Code Hygiene', false, 'No comments found. Use <!-- Comment --> to label sections.', 0);
    }

    // --- CRITERIA 3: CONTENT & PLANNING (Rubric Row 3) ---
    // Goal: Title, Paragraphs, List
    const hasParagraphs = $('p').length >= 1;
    const hasList = $('ul').length > 0 || $('ol').length > 0;
    const hasListItems = $('li').length > 0;

    if (hasParagraphs && hasList && hasListItems) {
        logResult('Content', true, 'Page content looks substantial (Bio + List).', 3);
    } else {
        let missing = [];
        if (!hasParagraphs) missing.push('Paragraphs');
        if (!hasList) missing.push('A List (ul or ol)');
        logResult('Content', false, `Page is feeling thin. Missing: ${missing.join(', ')}`, 1);
    }

    // --- CRITERIA 4: SYNTAX (Rubric Row 4) ---
    // Goal: Tags closed. Cheerio is forgiving, so we check for "Text content" inside tags to ensure they aren't empty.
    const bodyText = $('body').text().trim();
    if (bodyText.length > 50) {
        logResult('Syntax Check', true, 'Content is rendering text to the screen.', 3);
    } else {
        logResult('Syntax Check', false, 'Your page seems empty. Check for unclosed tags!', 0);
    }

    // --- SUMMARY ---
    console.log('\n' + '='.repeat(40));
    console.log(chalk.bold(`TOTAL ESTIMATED SCORE: ${score} / 12`));
    console.log('=' + '='.repeat(39));
    
    if (score < 8) {
        console.log(chalk.yellow('⚠️  Review the feedback above and push a new commit to improve your score!'));
        process.exit(1); // Fail the action so they see a red X
    } else {
        console.log(chalk.green('🚀 Excellent work! You are ready for the Gallery Walk.'));
        process.exit(0);
    }

} catch (error) {
    console.error(chalk.red('Error running grader:'), error);
    process.exit(1);
}