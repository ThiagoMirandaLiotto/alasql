// Export: CSV into a string, XLSX into a file
const fs = require('fs');
const os = require('os');
const path = require('path');
const file = path.join(os.tmpdir(), `alasql-bench-${process.pid}.xlsx`);
// Every run writes the same file, so it is deleted once, when the process ends (not inside the
// timed run). Registered on the first write, so a process that never runs this case adds nothing.
let cleanupRegistered = false;
const removeFile = () => {
	try {
		fs.rmSync(file, {force: true});
	} catch (e) {}
};
module.exports = {
	group: 'export',
	title: 'Export: CSV and XLSX',
	info: {
		tests:
			'25,000 rows written as CSV (returned as a string, no file) and as XLSX (written to a temporary file).',
		why: 'Export is one of the most used alasql features in browsers and Node. Converting the data twice on the way out costs time and memory.',
		read: 'Time and heap growth per export. XLSX depends on the xlsx package version the release uses.',
	},
	setup: g => {
		const rows = [];
		for (let id = 0; id < 25000; id++)
			rows.push({id, name: 'n' + g.int(1e6), amount: g.int(10000) / 100, city: 'c' + g.int(50)});
		return {rows};
	},
	cases: [
		{
			name: 'CSV into a string',
			sql: 'SELECT * INTO CSV({headers:true}) FROM ?',
			params: c => [c.rows],
			heap: true,
			check: (alasql, c, res) => String(res).length,
		},
		{
			name: 'XLSX into a file',
			sql: 'SELECT * INTO XLSX("<tmp>.xlsx", {headers:true}) FROM ?',
			run: (alasql, c) => {
				if (!cleanupRegistered) {
					cleanupRegistered = true;
					process.on('exit', removeFile);
				}
				return alasql(`SELECT * INTO XLSX("${file.replace(/\\/g, '/')}", {headers:true}) FROM ?`, [
					c.rows,
				]);
			},
			heap: true,
			maxIters: 5,
		},
	],
};
