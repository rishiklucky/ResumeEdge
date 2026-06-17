import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const parseResume = async (file) => {
    const fileType = file.type;
    let text = '';

    try {
        if (fileType === 'application/pdf') {
            text = await parsePDF(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            text = await parseDOCX(file);
        } else {
            throw new Error(`Unsupported file format: ${fileType}. Please upload PDF or DOCX.`);
        }

        return extractDataFromText(text);
    } catch (error) {
        console.error("Resume Parsing Error:", error);
        throw error;
    }
};

const parsePDF = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        const allItems = [];

        // 1. Collect all items to calculate statistics
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Normalize items with page index
            const pageItems = textContent.items.map(item => ({
                ...item,
                page: i,
                y: item.transform[5], // PDF Y is bottom-up
                x: item.transform[4],
                fontSize: Math.abs(item.transform[3]) // Transform[3] is typically Scale Y (Font Size)
            }));
            allItems.push(...pageItems);
        }

        // 2. Calculate Base Font Size (Mode of font sizes)
        const fontCounts = {};
        allItems.forEach(item => {
            const size = Math.round(item.fontSize * 10) / 10; // Round to 1 decimal
            if (size > 0) fontCounts[size] = (fontCounts[size] || 0) + 1;
        });

        // Find the most common font size (Body text)
        let baseFontSize = 0;
        let maxCount = 0;
        for (const [size, count] of Object.entries(fontCounts)) {
            if (count > maxCount) {
                maxCount = count;
                baseFontSize = parseFloat(size);
            }
        }

        // 3. Sort and Reconstruct Text with Markers
        // Sort by Page -> Y (desc) -> X (asc)
        allItems.sort((a, b) => {
            if (a.page !== b.page) return a.page - b.page;
            const yDiff = b.y - a.y;
            if (Math.abs(yDiff) > 5) return yDiff; // Line threshold
            return a.x - b.x;
        });

        let lastY = -1;
        let lastPage = -1;

        allItems.forEach(item => {
            // Decorate Headers: If font size is significantly larger (>1.1x), mark it
            const isHeader = item.fontSize > (baseFontSize * 1.15);
            const prefix = isHeader ? '\n### ' : '';

            // New Page handling
            if (item.page !== lastPage) {
                fullText += '\n\n';
                lastPage = item.page;
                lastY = -1;
            }

            // New Line handling (Y-axis shift)
            if (lastY !== -1 && Math.abs(item.y - lastY) > 5) {
                fullText += '\n' + prefix;
            } else if (lastY !== -1) {
                // Inline spacing
                fullText += ' ';
            } else {
                // First item
                fullText += prefix;
            }

            fullText += item.str;
            lastY = item.y;
        });

        return fullText;
    } catch (e) {
        console.error("PDF Parsing Details:", e);
        throw new Error("Failed to read PDF file. It might be password protected or corrupted.");
    }
};

const parseDOCX = async (file) => {
    // Mammoth output is simpler, but we can't easily detect font sizes. 
    // We return raw text and rely on regex heuristics.
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};

const extractDataFromText = (text) => {
    // Cleanup: Remove common filler text
    // Remove "Page X of Y"
    let cleanText = text.replace(/Page \d+ of \d+/gi, '');

    // Normalize Newlines
    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l);

    const extracted = {
        personalInfo: {},
        education: [],
        experience: [],
        projects: [],
        skills: '',
        languages: '',
        certificates: []
    };

    // --- Regex patterns ---
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const linkedinRegex = /linkedin\.com\/in\/([^\s/]+)/i;
    const githubRegex = /github\.com\/([^\s/]+)/i;
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;

    // --- Extract Basic Info ---
    const emailMatch = cleanText.match(emailRegex);
    if (emailMatch) extracted.personalInfo.email = emailMatch[0];

    const phoneMatch = cleanText.match(phoneRegex);
    if (phoneMatch) extracted.personalInfo.phone = phoneMatch[0];

    const linkedinMatch = cleanText.match(linkedinRegex);
    if (linkedinMatch) extracted.personalInfo.linkedin = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;

    const githubMatch = cleanText.match(githubRegex);
    if (githubMatch) extracted.personalInfo.github = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;

    // Name Heuristic: Look for large text (###) at the top, or first few lines
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].replace(/^###\s*/, ''); // Remove marker
        const upper = line.toUpperCase();
        const skip = ['RESUME', 'CV', 'PAGE', 'CONTACT', 'SUMMARY', 'PROFILE', 'EDUCATION', 'EXPERIENCE'];

        // If line matches a person's name pattern (no numbers, no special chars except standard name ones)
        if (line.length > 3 && line.length < 40 && !line.includes('@') && !/\d/.test(line)) {
            if (!skip.some(s => upper.includes(s))) {
                extracted.personalInfo.fullName = line;
                break;
            }
        }
    }

    // --- Section identification ---
    const keywords = {
        experience: ['experience', 'work history', 'employment', 'career history', 'professional background'],
        education: ['education', 'academic', 'qualifications', 'university', 'college'],
        skills: ['skills', 'technologies', 'technical skills', 'stack', 'core competencies'],
        projects: ['projects', 'personal projects', 'side projects', 'key projects'],
        languages: ['languages'],
        certificates: ['certificates', 'awards', 'honors', 'certifications'],
        summary: ['summary', 'profile', 'about me', 'objective']
    };

    const sectionLines = {};
    let currentSection = null;

    for (const line of lines) {
        // Check for Header Marker '###' OR common keyword headers
        const isMarkedHeader = line.startsWith('### ');
        const content = line.replace(/^###\s*/, ''); // Clean content
        const lowerContent = content.toLowerCase();

        let isSectionHeader = false;

        // Check if this line triggers a new section
        if (isMarkedHeader || content.length < 50) {
            for (const [key, patterns] of Object.entries(keywords)) {
                // strict check for section headers
                if (patterns.some(p => lowerContent === p || lowerContent === p + ':' || lowerContent.startsWith(p + ' ') || lowerContent.endsWith(p))) {
                    currentSection = key;
                    if (!sectionLines[key]) sectionLines[key] = [];
                    isSectionHeader = true;
                    break;
                }
            }
        }

        if (!isSectionHeader && currentSection) {
            sectionLines[currentSection].push(content); // Store clean content
        }
    }

    // --- Parsing Sections ---

    // 1. Summary
    if (sectionLines.summary) {
        extracted.personalInfo.summary = sectionLines.summary.join('\n');
    }

    // Helper: advanced Item Splitter
    const splitItems = (lines) => {
        const items = [];
        let currentItem = [];

        // Heuristics for new item start:
        // 1. Line starts with '### ' (Large text) - likely a Company or Job Title, but we stripped markers in sectionLines
        // 2. Line contains a Date Range
        const dateRegex = /(\b(19|20)\d{2}\b)|(\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{4})/i;

        lines.forEach(line => {
            const hasDate = dateRegex.test(line);

            // Heuristic: If line is short and looks like a Title (Caps or Title Case) AND previous item has specific content...
            // Checking for common role keywords if no date is found
            const roleKeywords = ['Engineer', 'Developer', 'Manager', 'Analyst', 'Consultant', 'Intern', 'Designer', 'Architect'];
            const hasRole = roleKeywords.some(r => line.includes(r));

            if ((hasDate || (hasRole && line.length < 50)) && currentItem.length > 2) {
                // Only split if previous item has some substance, to avoid splitting header lines
                items.push(currentItem);
                currentItem = [];
            } else if (hasDate && currentItem.length > 0) {
                items.push(currentItem);
                currentItem = [];
            }

            currentItem.push(line);
        });

        if (currentItem.length > 0) items.push(currentItem);
        if (items.length === 0 && lines.length > 0) items.push(lines);
        return items;
    };

    if (sectionLines.experience) {
        const blocks = splitItems(sectionLines.experience);
        extracted.experience = blocks.map(block => {
            const joined = block.join('\n');
            // Attempt to extract Role/Company
            // Heuristic: Line 1 involves Job Title or Company. 
            // We use scoring to decide which line is Company vs Role
            const firstLine = block[0] || '';
            const secondLine = block[1] || '';

            const dateMatch = joined.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{4}|(?:\d{1,2}\/)?\d{4})\s*(?:-|to|–)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{4}|Present|Current|Now|(?:\d{1,2}\/)?\d{4})/i);

            let startDate = '', endDate = '';
            let description = block.slice(2).join('\n');

            if (dateMatch) {
                startDate = dateMatch[1];
                endDate = dateMatch[2];
                // Clean date from lines
                if (block[0] && block[0].includes(startDate)) {
                    // Date is in first line
                    description = block.slice(1).join('\n');
                }
            } else {
                const yearMatch = joined.match(/\b(20\d{2})\b/);
                if (yearMatch) endDate = yearMatch[1];
                description = block.slice(1).join('\n'); // Fallback
            }

            // Distinguish Company vs Role
            let company = firstLine;
            let role = secondLine;
            const roleKeywords = ['Engineer', 'Developer', 'Manager', 'Analyst', 'Consultant', 'Intern', 'Designer', 'Architect', 'Lead', 'Chief', 'Head'];

            // If first line has role keyword, swap
            if (roleKeywords.some(k => firstLine.includes(k)) && !roleKeywords.some(k => secondLine.includes(k))) {
                role = firstLine;
                company = secondLine;
            }

            // Clean company name of date
            if (startDate) company = company.replace(dateMatch[0], '').trim();
            company = company.split(/,|\|/)[0].trim(); // Take first part if separate by comma

            return {
                company: company,
                role: role,
                startDate,
                endDate,
                description: description.replace(/^[•-]\s*/gm, '') // Clean bullets
            };
        });
    }

    if (sectionLines.education) {
        const blocks = splitItems(sectionLines.education);
        extracted.education = blocks.map(block => {
            const firstLine = block[0] || '';
            const secondLine = block[1] || '';

            // Scoring for School vs Degree
            const schoolKeywords = ['University', 'College', 'Institute', 'School', 'Academy'];
            const degreeKeywords = ['Bachelor', 'Master', 'PhD', 'B.S.', 'M.S.', 'B.A.', 'M.A.', 'Diploma', 'Degree', 'Associate'];

            let school = firstLine;
            let degree = secondLine;

            // Check first line
            const firstLineIsSchool = schoolKeywords.some(k => firstLine.includes(k));
            const firstLineIsDegree = degreeKeywords.some(k => firstLine.includes(k));

            if (firstLineIsDegree && !firstLineIsSchool) {
                degree = firstLine;
                school = secondLine;
            }

            return {
                school: school,
                degree: degree,
                startDate: '',
                endDate: block.find(l => /\d{4}/.test(l))?.match(/\d{4}/)?.[0] || '',
                gpa: block.find(l => /GPA/i.test(l)) || ''
            };
        });
    }

    if (sectionLines.projects) {
        const blocks = [];
        let currentBlock = [];
        sectionLines.projects.forEach(line => {
            // Split by title-like lines
            if (line.length < 50 && !line.includes('•') && /[A-Z]/.test(line.charAt(0)) && currentBlock.length > 0) {
                blocks.push(currentBlock);
                currentBlock = [];
            }
            currentBlock.push(line);
        });
        if (currentBlock.length > 0) blocks.push(currentBlock);

        extracted.projects = blocks.map(block => {
            const joined = block.join('\n');
            const linkMatch = joined.match(urlRegex);

            return {
                name: block[0] || 'Project',
                tech: '',
                link: linkMatch ? linkMatch[0] : '',
                description: block.slice(1).join('\n').replace(/^[•-]\s*/gm, '')
            };
        });
    }

    if (sectionLines.skills) {
        // Clean up Skills: often "Languages: Python, Java"
        // Try to merge lines if they look like a continuous list
        extracted.skills = sectionLines.skills.map(l => l.replace(/^(Skills|Technologies|Languages):/i, '').trim()).join(', ');
    }

    if (sectionLines.languages) {
        extracted.languages = sectionLines.languages.join(', ');
    }

    if (sectionLines.certificates) {
        extracted.certificates = sectionLines.certificates.map(c => ({ name: c, issuer: '', date: '', link: '' }));
    }

    return extracted;
};
