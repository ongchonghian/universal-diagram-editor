
import { parseGantt, generateCsv, generateSuperPa } from './gantt-utils.js';
// We might need to mock dayjs or just use it if environment supports imports
// Jest usually handles imports fine.

describe('gantt-utils', () => {

    const simpleGantt = `
    gantt
        title Test Project
        dateFormat YYYY-MM-DD
        section Section 1
        Task A       :done,    task1, 2024-01-01, 2024-01-05
        Task B       :active,  task2, 2024-01-06, 2d
        Task C       :crit,    task3, 2024-01-08, 2024-01-10
    `;

    describe('parseGantt', () => {
        it('should parse simple gantt chart', () => {
            const tasks = parseGantt(simpleGantt);
            expect(tasks).toHaveLength(3);
            
            expect(tasks[0].task).toBe('Task A');
            expect(tasks[0].status).toBe('Completed');
            expect(tasks[0].start).toBe('2024-01-01');
            expect(tasks[0].end).toBe('2024-01-05');

            expect(tasks[1].task).toBe('Task B');
            expect(tasks[1].status).toBe('In Progress');
            expect(tasks[1].start).toBe('2024-01-06');
            // 2024-01-06 + 2 days = 2024-01-08
            expect(tasks[1].end).toBe('2024-01-08'); 
            
            expect(tasks[2].task).toBe('Task C');
            expect(tasks[2].priority).toBe('High');
            expect(tasks[2].end).toBe('2024-01-10');
        });

        it('should handle missing header lines gracefully', () => {
            const code = `
            section Minimal
            Min Task : 2024-01-01, 1d
            `;
            const tasks = parseGantt(code);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].task).toBe('Min Task');
        });
    });

    describe('generateCsv', () => {
        it('should generate correct CSV header and rows', () => {
            const tasks = [
                { section: 'S1', task: 'T1', start: '2024-01-01', end: '2024-01-02', duration: '1d', status: 'Pending', priority: 'Medium' }
            ];
            const csv = generateCsv(tasks);
            expect(csv).toContain('Section,Task,Start Date,End Date,Duration,Status,Priority');
            expect(csv).toContain('"S1","T1","2024-01-01","2024-01-02","1d","Pending","Medium"');
        });
    });

    describe('generateSuperPa', () => {
        it('should generate markdown with correct format', () => {
            const tasks = [
                { section: 'S1', task: 'Critical One', start: '2024-01-01', end: '2024-01-05', status: 'Pending', priority: 'High' },
                { section: 'S1', task: 'Normal One', start: '2024-01-01', end: '2024-01-05', status: 'Pending', priority: 'Medium' },
                { section: 'S1', task: 'Done One', start: '2024-01-01', end: '2024-01-05', status: 'Completed', priority: 'Medium' }
            ];
            const title = "My Project";
            const md = generateSuperPa(tasks, title);
            
            expect(md).toContain('# My Project');
            expect(md).toContain('## Incomplete Tasks');
            // Should contain incomplete tasks
            expect(md).toContain('- [ ] **Critical One** (Priority: High, Due: 2024-01-05)');
            expect(md).toContain('- [ ] **Normal One** (Priority: Medium, Due: 2024-01-05)');
            // Should NOT contain completed tasks
            expect(md).not.toContain('Done One');
        });
    });
});
