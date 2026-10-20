/**
 * Unified Test Runner for all CodeAlpha Cloud Computing Tasks
 */
const { spawnSync } = require('child_process');
const path = require('path');

const tasks = [
  { name: 'Task 1: Data Redundancy Removal System', dir: 'task1-data-redundancy' },
  { name: 'Task 3: Cloud-Based Bus Pass System', dir: 'task3-bus-pass' },
  { name: 'Task 4: AI & Retrieval Cloud Chatbot', dir: 'task4-chatbot' }
];

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║       CodeAlpha Cloud Computing Internship — Test Suite       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const task of tasks) {
  console.log(`\n▶ Running tests for ${task.name}...`);
  console.log('─'.repeat(65));

  const taskDir = path.join(__dirname, '..', task.dir);
  const result = spawnSync('npm', ['test'], {
    cwd: taskDir,
    stdio: 'inherit',
    shell: true
  });

  const passed = result.status === 0;
  if (passed) {
    totalPassed++;
    results.push({ name: task.name, status: 'PASSED' });
  } else {
    totalFailed++;
    results.push({ name: task.name, status: 'FAILED' });
  }
}

console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                      FINAL TEST SUMMARY                       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
results.forEach(r => {
  const icon = r.status === 'PASSED' ? '✅' : '❌';
  console.log(`  ${icon} ${r.name.padEnd(48)} [${r.status}]`);
});
console.log('─'.repeat(65));
console.log(`Summary: ${totalPassed}/${tasks.length} task suites passed.`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All CodeAlpha task tests passed successfully!\n');
  process.exit(0);
}
