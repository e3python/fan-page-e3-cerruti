const fs = require('fs');
const cheerio = require('cheerio');

const FILE_PATH = 'index.html';
const CSS_PATH = '';  // Will search for .css files
const MAX_SCORE = 12;

let score = 0;
let feedbackRows = [];
let warnings = [];

function addResult(category, points, maxPoints, msg) {
    const icon = points === maxPoints ? '✅' : (points > 0 ? '⚠️' : '❌');
    score += points;
    feedbackRows.push(`| ${icon} | **${category}** | ${points}/${maxPoints} | ${msg} |`);
}

function addWarning(title, msg) {
    warnings.push(`⚠️ **${title}:** ${msg}`);
}

try {
    // Check if index.html exists
    if (!fs.existsSync(FILE_PATH)) {
        console.error('❌ FATAL: index.html not found!');
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(FILE_PATH, 'utf8');
    const $ = cheerio.load(htmlContent);

    // Find CSS files in the directory
    const cssFiles = fs.readdirSync('.').filter(f => f.endsWith('.css'));

    // =========================================================
    // CHECK 1: Images Present (2 pts)
    // =========================================================
    const images = $('img');
    const imageCount = images.length;
    
    if (imageCount >= 3) {
        addResult('Images Required', 2, 2, `Found ${imageCount} images.`);
    } else if (imageCount > 0) {
        addResult('Images Required', 1, 2, `Only ${imageCount} image(s) found. Need 3.`);
    } else {
        addResult('Images Required', 0, 2, `No images found. Need 3.`);
    }

    // =========================================================
    // CHECK 2: Attribution Visible (2 pts)
    // =========================================================
    let attributionCount = 0;
    const attributionKeywords = ['attribution', 'image by', 'photo by', 'credit', 'source', 'license', 'cc-by', 'public domain'];
    const pageText = $.root().text().toLowerCase();
    
    // Count visible attribution mentions
    const imageAttrText = images.parent().text().toLowerCase();
    attributionKeywords.forEach(keyword => {
        if (imageAttrText.includes(keyword)) attributionCount++;
    });

    if (attributionCount > 0) {
        addResult('Attribution Visible', 2, 2, 'Attribution text found near images.');
    } else {
        addResult('Attribution Visible', 0, 2, 'No visible attribution found. Add credit near each image.');
    }

    // =========================================================
    // CHECK 3: License Information (2 pts)
    // =========================================================
    const licenseKeywords = ['cc-by', 'cc-0', 'public domain', 'attribution', 'creative commons', 'cc license'];
    let hasLicense = false;
    licenseKeywords.forEach(keyword => {
        if (pageText.includes(keyword)) hasLicense = true;
    });

    if (hasLicense) {
        addResult('License Information', 2, 2, 'License or Creative Commons info detected.');
    } else {
        addResult('License Information', 0, 2, 'No license info found. Include CC license or public domain status.');
    }

    // =========================================================
    // CHECK 4: CSS Class Styling (2 pts)
    // =========================================================
    const cssContent = cssFiles.length > 0 ? fs.readFileSync(cssFiles[0], 'utf8') : '';
    const classSelectors = (cssContent.match(/\.[a-zA-Z_][a-zA-Z0-9_-]*/g) || []).length;
    const imagesWithClass = images.filter((i, el) => $(el).attr('class')).length;

    if (imagesWithClass >= 1 && classSelectors >= 1) {
        addResult('Image Styling', 2, 2, `${imagesWithClass} image(s) styled with CSS class.`);
    } else if (imagesWithClass > 0) {
        addResult('Image Styling', 1, 2, 'Image has class but may not be styled in CSS.');
    } else {
        addResult('Image Styling', 0, 2, 'No images styled with CSS classes.');
    }

    // =========================================================
    // CHECK 5: Text CSS Properties (2 pts)
    // =========================================================
    const textProperties = ['color', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-align', 'line-height', 'letter-spacing'];
    const usedTextProps = new Set();
    
    textProperties.forEach(prop => {
        if (cssContent.includes(prop)) {
            usedTextProps.add(prop);
        }
    });

    if (usedTextProps.size >= 2) {
        addResult('Text Styling', 2, 2, `${usedTextProps.size} text properties used: ${Array.from(usedTextProps).join(', ')}.`);
    } else if (usedTextProps.size === 1) {
        addResult('Text Styling', 1, 2, `Only 1 text property used: ${Array.from(usedTextProps)[0]}. Need at least 2.`);
    } else {
        addResult('Text Styling', 0, 2, 'No text styling properties found in CSS.');
    }

    // =========================================================
    // CHECK 6: Element CSS Properties (2 pts)
    // =========================================================
    const elementProperties = ['margin', 'padding', 'background-color', 'background', 'border', 'border-radius', 'width', 'height', 'display', 'position'];
    const usedElemProps = new Set();
    
    elementProperties.forEach(prop => {
        if (cssContent.includes(prop)) {
            usedElemProps.add(prop);
        }
    });

    // Check if border-only (doesn't meet variety requirement)
    const borderOnlyProps = Array.from(usedElemProps).filter(p => p.includes('border'));
    const nonBorderProps = Array.from(usedElemProps).filter(p => !p.includes('border'));

    if (usedElemProps.size >= 2 && nonBorderProps.length >= 1) {
        addResult('Element Styling', 2, 2, `${usedElemProps.size} element properties used with variety: ${Array.from(usedElemProps).slice(0, 3).join(', ')}.`);
    } else if (usedElemProps.size >= 2) {
        addResult('Element Styling', 1, 2, `${usedElemProps.size} element properties found, but may be all borders. Need variety (background + border, spacing, etc).`);
    } else {
        addResult('Element Styling', 0, 2, `Only ${usedElemProps.size} element property used. Need at least 2 different types.`);
    }

    // =========================================================
    // WARNINGS (Non-scoring)
    // =========================================================
    
    // Check for inline styles
    if (htmlContent.includes('style=')) {
        addWarning('Inline Styles Detected', 'Found style= attributes on HTML tags. Professional code uses external stylesheets only.');
    }

    // Check for untagged text
    const bodyText = $('body').html();
    if (bodyText && bodyText.trim().match(/^[^<]*[a-zA-Z]/)) {
        addWarning('Untagged Text', 'Text found directly in body without HTML tags. Wrap text in semantic tags like <p>, <h1>, etc.');
    }

    // Check for CSS file
    if (cssFiles.length === 0) {
        addWarning('No CSS File', 'No .css file found. All styling should be in an external stylesheet.');
    }

    // AI Detection
    const aiKeywords = ['chatgpt', 'claude', 'copilot', 'artificial intelligence'];
    if (htmlContent.toLowerCase().includes('generated by') || cssContent.toLowerCase().includes('ai-generated')) {
        addWarning('AI Assistance Detected', 'Comments mention AI tools. Verify this work is your own understanding.');
    }

    // =========================================================
    // GENERATE REPORT
    // =========================================================
    const summary = `
# 📝 Stage 2 Grading Report: CSS & Media

| Status | Category | Score | Feedback |
| :---: | :--- | :--- | :--- |
${feedbackRows.join('\n')}

### 🏆 Total Score: ${score} / ${MAX_SCORE}

${warnings.length > 0 ? `### ⚠️ Notes for Review:\n${warnings.map(w => `- ${w}`).join('\n')}\n` : ''}

### 📋 Checklist
- ✅ Images: Minimum 3 required, variety recommended
- ✅ Attribution: Visible near images, credit clearly stated
- ✅ License: CC license or public domain mentioned
- ✅ Styling: At least 1 image uses a CSS class
- ✅ Text Properties: At least 2 different properties (color, font-size, etc.)
- ✅ Element Properties: At least 2 different types (spacing, background, borders, etc.)
`;

    // Write outputs
    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    }
    fs.writeFileSync('grading-feedback.md', summary);
    console.log(summary);

    // Exit code: fail if score < 8
    if (score < 8) process.exit(1);

} catch (error) {
    console.error('❌ Grader Error:', error.message);
    process.exit(1);
}
