// ──────────────────────────────────────────────
// NafAcademy – Term Report Card HTML Generator
// Generates a printable HTML report card from marks.
// ──────────────────────────────────────────────
import { SCHOOL_NAME, EA_GRADE_SCALE } from '@/constants';
import type { Mark, AppUser, Term, ClassRoom, Subject } from '@/types';

/** Convert a raw score to grade letter using EA scale */
function scoreToGrade(score: number, maxScore: number) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  for (const g of EA_GRADE_SCALE) {
    if (pct >= g.min) return { pct, grade: g.grade, points: g.points, label: g.label };
  }
  return { pct, grade: 'F', points: 7, label: 'Failure' };
}

interface ReportRow {
  subject: string;
  bot: string;
  mid: string;
  eot: string;
  avg: number;
  grade: string;
  points: number;
  remark: string;
}

export interface ReportCardData {
  student: AppUser;
  term: Term;
  classroom: ClassRoom | null;
  rows: ReportRow[];
  aggregate: number;
  totalPoints: number;
  division: string;
}

/** Compute division from total best-8 points (Uganda O-Level system) */
function getDivision(totalPoints: number): string {
  if (totalPoints <= 32) return 'I';
  if (totalPoints <= 45) return 'II';
  if (totalPoints <= 58) return 'III';
  if (totalPoints <= 72) return 'IV';
  return 'U';
}

/** Build structured report card data from marks */
export function buildReportData(
  student: AppUser,
  term: Term,
  classroom: ClassRoom | null,
  marks: Mark[],
  subjectMap: Map<string, Subject>
): ReportCardData {
  // Group marks by subjectId
  const bySubject = new Map<string, Mark[]>();
  for (const m of marks) {
    const list = bySubject.get(m.subjectId) || [];
    list.push(m);
    bySubject.set(m.subjectId, list);
  }

  const rows: ReportRow[] = [];

  for (const [subId, subMarks] of bySubject) {
    const subName = subjectMap.get(subId)?.name ?? subId;
    const bot = subMarks.find((m) => m.examType === 'bot');
    const mid = subMarks.find((m) => m.examType === 'mid');
    const eot = subMarks.find((m) => m.examType === 'eot');

    // Weighted average: BOT 30%, MID 30%, EOT 40%  (configurable later via school weights)
    let totalWeight = 0;
    let weightedSum = 0;
    if (bot) { const p = (bot.score / bot.maxScore) * 100; weightedSum += p * 30; totalWeight += 30; }
    if (mid) { const p = (mid.score / mid.maxScore) * 100; weightedSum += p * 30; totalWeight += 30; }
    if (eot) { const p = (eot.score / eot.maxScore) * 100; weightedSum += p * 40; totalWeight += 40; }

    const avg = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const { grade, points, label } = scoreToGrade(avg, 100);

    rows.push({
      subject: subName,
      bot: bot ? `${bot.score}/${bot.maxScore}` : '-',
      mid: mid ? `${mid.score}/${mid.maxScore}` : '-',
      eot: eot ? `${eot.score}/${eot.maxScore}` : '-',
      avg,
      grade,
      points,
      remark: label,
    });
  }

  // Sort by subject name
  rows.sort((a, b) => a.subject.localeCompare(b.subject));

  const totalPoints = rows.reduce((sum, r) => sum + r.points, 0);
  const aggregate = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.avg, 0) / rows.length) : 0;
  const division = getDivision(totalPoints);

  return { student, term, classroom, rows, aggregate, totalPoints, division };
}

/** Generate full HTML document for the report card */
export function generateReportCardHTML(data: ReportCardData): string {
  const { student, term, classroom, rows, aggregate, totalPoints, division } = data;

  const subjectRows = rows
    .map(
      (r, i) => `
        <tr style="${i % 2 === 0 ? 'background:#f9fafb;' : ''}">
          <td>${r.subject}</td>
          <td class="center">${r.bot}</td>
          <td class="center">${r.mid}</td>
          <td class="center">${r.eot}</td>
          <td class="center bold">${r.avg}%</td>
          <td class="center bold">${r.grade}</td>
          <td class="center">${r.points}</td>
          <td>${r.remark}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Report Card – ${student.displayName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #212121; padding: 24px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #1A73E8; padding-bottom: 16px; }
    .header h1 { font-size: 22px; color: #1A73E8; margin-bottom: 4px; }
    .header h2 { font-size: 16px; font-weight: 400; color: #555; }
    .header .subtitle { font-size: 13px; color: #888; margin-top: 4px; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 16px; gap: 16px; }
    .info-card { flex: 1; background: #f5f7fa; border-radius: 8px; padding: 12px; }
    .info-card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-card .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
    th { background: #1A73E8; color: #fff; padding: 10px 8px; text-align: left; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; }
    .summary-box { flex: 1; text-align: center; padding: 14px 8px; border-radius: 8px; }
    .summary-box .num { font-size: 24px; font-weight: 700; }
    .summary-box .lbl { font-size: 11px; color: #555; margin-top: 2px; text-transform: uppercase; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; color: #888; }
    .signature { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-line { width: 200px; border-top: 1px solid #999; padding-top: 4px; font-size: 12px; color: #555; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${SCHOOL_NAME}</h1>
    <h2>STUDENT TERM REPORT CARD</h2>
    <div class="subtitle">${term.name} — ${term.year}</div>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <div class="label">Student Name</div>
      <div class="value">${student.displayName}</div>
    </div>
    <div class="info-card">
      <div class="label">Class</div>
      <div class="value">${classroom?.name ?? 'N/A'}</div>
    </div>
    <div class="info-card">
      <div class="label">Term</div>
      <div class="value">${term.name}</div>
    </div>
    <div class="info-card">
      <div class="label">Year</div>
      <div class="value">${term.year}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th class="center">BOT</th>
        <th class="center">MID</th>
        <th class="center">EOT</th>
        <th class="center">Avg %</th>
        <th class="center">Grade</th>
        <th class="center">Pts</th>
        <th>Remark</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-box" style="background:#e8f5e9;">
      <div class="num">${aggregate}%</div>
      <div class="lbl">Average</div>
    </div>
    <div class="summary-box" style="background:#e3f2fd;">
      <div class="num">${totalPoints}</div>
      <div class="lbl">Total Points</div>
    </div>
    <div class="summary-box" style="background:#fff3e0;">
      <div class="num">DIV ${division}</div>
      <div class="lbl">Division</div>
    </div>
    <div class="summary-box" style="background:#f3e5f5;">
      <div class="num">${rows.length}</div>
      <div class="lbl">Subjects</div>
    </div>
  </div>

  <div class="signature">
    <div class="sig-line">Class Teacher</div>
    <div class="sig-line">Head Teacher</div>
    <div class="sig-line">Parent/Guardian</div>
  </div>

  <div class="footer">
    <span>Generated on ${new Date().toLocaleDateString()}</span>
    <span>${SCHOOL_NAME}</span>
  </div>
</body>
</html>`;
}
