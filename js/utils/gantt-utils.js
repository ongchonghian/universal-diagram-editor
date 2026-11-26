/**
 * Utility functions for Gantt Chart Export
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration'; // Import duration plugin

dayjs.extend(customParseFormat);
dayjs.extend(duration); // Extend dayjs with duration

/**
 * Parses Mermaid Gantt code to extract task details.
 * This is a simplified parser and might need adjustments for complex Gantt charts.
 * @param {string} code - The Mermaid Gantt chart code.
 * @returns {Array} - Array of task objects.
 */
export const parseGantt = (code) => {
    if (!code) return [];

    const lines = code.split('\n');
    let dateFormat = 'YYYY-MM-DD'; // Default
    let currentSection = '';
    const tasks = [];
    const taskRegex = /^\s*(.+?)\s*:\s*(.*)$/;
    
    // Helper to parse date string
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        return dayjs(dateStr.trim(), dateFormat);
    };

    // Helper to calculate end date from start and duration
    // mermaid duration format: 30d, 2w, etc.
    const calculateEnd = (start, durationStr) => {
        if (!start || !start.isValid() || !durationStr) return null;
        const match = durationStr.match(/(\d+)([dDwWmMyYhHsS])/); // captured duration unit
        if (!match) return null;
        const val = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        
        // Map mermaid units to dayjs units
        const unitMap = {
            'd': 'day',
            'w': 'week',
            'm': 'minute', // Mermaid treats 'm' as minute usually, 'M' might be months but let's stick to simple
            'y': 'year',
            'h': 'hour',
            's': 'second'
        };

        // Note: Mermaid might use 'M' for months? It's ambiguous in simple regex.
        // Let's assume standard 'd', 'w'.
        return start.add(val, unitMap[unit] || 'day');
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('gantt') || trimmed.startsWith('title')) continue;

        if (trimmed.startsWith('dateFormat')) {
            dateFormat = trimmed.replace('dateFormat', '').trim();
            continue;
        }

        if (trimmed.startsWith('section')) {
            currentSection = trimmed.replace('section', '').trim();
            continue;
        }

        const match = taskRegex.exec(line);
        // Exclude lines that might be other config like 'axisFormat'
        if (match && !trimmed.startsWith('axisFormat') && !trimmed.startsWith('todayMarker')) {
             const title = match[1].trim();
             const meta = match[2].split(',');
             
             // Meta format: [tags], [start], [end/duration]
             // Example: done,    des1, 2014-01-06,2014-01-08
             // Example: active,  des2, 2014-01-09, 3d
             // Example:          des3, after des2, 5d
             
             // We need to try to identify parts.
             // Typically parts are: status/id, start, end/duration
             // Statuses: active, done, crit, milestone
             
             let tags = [];
             let start = null;
             let end = null;
             let durationStr = null;
             let id = null;
             let after = null;

             const parts = meta.map(p => p.trim());
             
             // Naive parsing strategy:
             // Iterate parts to find dates vs tags vs duration
             
             for (const part of parts) {
                 if (['active', 'done', 'crit', 'milestone'].includes(part)) {
                     tags.push(part);
                 } else if (part.startsWith('after ')) {
                     after = part.replace('after ', '').trim();
                 } else if (dayjs(part, dateFormat, true).isValid()) {
                     if (!start) start = parseDate(part);
                     else end = parseDate(part);
                 } else if (part.match(/\d+[dDwWmMyYhHsS]/)) {
                     durationStr = part;
                 } else {
                     // Assume it's an ID if it's not any of above?
                     // Or just part of tags if it is a generic string?
                     // Mermaid is flexible. Let's assume if it looks like an ID (alphanumeric)
                     if (!id) id = part; 
                 }
             }

             // If we have an 'after' dependency, we can't easily calculate absolute dates 
             // without solving the whole graph. 
             // For this MVP, we might skip precise calculation for relative tasks 
             // unless we build a dependency resolver.
             // Let's leave start/end null if relative for now, or default to Today?
             // Or better: Warn that relative dates aren't fully supported in CSV export yet.
             
             // Simplest fallback for duration if we have start but no end
             if (start && durationStr && !end) {
                 end = calculateEnd(start, durationStr);
             }

             tasks.push({
                 section: currentSection,
                 task: title,
                 id: id || '',
                 start: start ? start.format('YYYY-MM-DD') : '',
                 end: end ? end.format('YYYY-MM-DD') : '',
                 duration: durationStr || '',
                 tags: tags,
                 priority: tags.includes('crit') ? 'High' : 'Medium', // Derived for SuperPA
                 status: tags.includes('done') ? 'Completed' : (tags.includes('active') ? 'In Progress' : 'Pending') // Derived status
             });
        }
    }

    return tasks;
};

/**
 * Generates a CSV string from tasks.
 * @param {Array} tasks - Array of task objects.
 * @returns {string} - CSV content.
 */
export const generateCsv = (tasks) => {
    const header = 'Section,Task,Start Date,End Date,Duration,Status,Priority\n';
    const rows = tasks.map(t => 
        `"${t.section}","${t.task}","${t.start}","${t.end}","${t.duration}","${t.status}","${t.priority}"`
    ).join('\n');
    return header + rows;
};

/**
 * Generates SuperPA Markdown content.
 * @param {Array} tasks - Array of task objects.
 * @param {string} title - Project title.
 * @returns {string} - Markdown content.
 */
export const generateSuperPa = (tasks, title = 'Project Plan') => {
    const incompleteTasks = tasks.filter(t => t.status !== 'Completed');
    
    let md = `# ${title}\n\n`;
    md += `## Incomplete Tasks\n\n`;
    
    if (incompleteTasks.length === 0) {
        md += `_No incomplete tasks found._\n`;
    } else {
        incompleteTasks.forEach(t => {
            // Format: - [ ] **Task Name** (Priority: [Level], Due: [YYYY-MM-DD]) - *Assignee: []*
            // Use End Date as due date, fallback to 'TBD'
            const dueDate = t.end || 'TBD';
            md += `- [ ] **${t.task}** (Priority: ${t.priority}, Due: ${dueDate}) - *Assignee: []* <!-- section: ${t.section} -->\n`;
        });
    }

    return md;
};

/**
 * Trigger download of a string content.
 * @param {string} content - File content.
 * @param {string} filename - Name of the file.
 * @param {string} mimeType - MIME type.
 */
export const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
