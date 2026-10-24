// Validate everything under content/ (docs/05-teknis.md §3). Exits 1 on any error.
import { loadContent, printReport } from './content';

const { content, report } = loadContent('content');
printReport(report);

const verified = [...content.prompts.values()].filter((p) => p.status === 'verified').length;
console.log(
  `\n${content.prompts.size} prompts (${verified} verified), ${content.mountains.length} checkpoints, ` +
    `${content.schedule.size} scheduled days · ${report.errors.length} errors, ${report.warnings.length} warnings`,
);
if (report.errors.length > 0) process.exit(1);
