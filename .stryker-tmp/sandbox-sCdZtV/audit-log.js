// @ts-nocheck
// CommonJS version of audit-log for Node.js and Jest compatibility
function logOperation(...args) {
	if (args == null || (args.length === 1 && args[0] == null)) {
		console.log('[AUDIT]', args);
		return;
	}
	if (args.length === 0) {
		console.log('[AUDIT]');
		return;
	}
	console.log('[AUDIT]', ...args);
}

module.exports = { logOperation };
