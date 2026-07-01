import fs from "node:fs";
import JSZip from "jszip";

const cv = `Jane Mwangi
Nairobi, Kenya | jane@example.com | +254 700 000 000 | linkedin.com/in/janemwangi | github.com/janemwangi

Profile
Data analyst with internship experience in operations reporting, Excel, SQL, Power BI, and dashboarding. Targeting junior data analyst roles in operations and education.

Skills
Excel, SQL, Power BI, Python, Google Sheets, data cleaning, dashboarding, stakeholder communication.

Experience
Data Analyst Intern | Kuza Analytics | Jan 2025 - Jun 2025
- Built weekly Power BI dashboards for 6 branch managers, reducing manual reporting time by 30%.
- Cleaned 12,000 customer records in Excel and SQL to improve campaign targeting accuracy.
- Coordinated data requests from operations, sales, and support teams.

Projects
Student Attendance Dashboard | 2024
- Designed a dashboard tracking attendance trends for 320 students across 8 classes.

Education
Bachelor of Science in Statistics | University of Nairobi | 2024

Certifications
Google Data Analytics Certificate | 2025`;

const escapeXml = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
);
zip.folder("_rels")?.file(
  ".rels",
  `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
);

const paragraphs = cv
  .split("\n")
  .map((line) => `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`)
  .join("");

zip.folder("word")?.file(
  "document.xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}</w:body>
</w:document>`
);

const output = process.argv[2] ?? "/tmp/sample-cv.docx";
const buffer = await zip.generateAsync({ type: "nodebuffer" });
fs.writeFileSync(output, buffer);
