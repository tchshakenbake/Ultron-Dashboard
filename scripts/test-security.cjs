const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultron-security-"));
for (const sourcePath of ["lib/security/env.ts", "lib/security/secret-vault.ts", "lib/security/approval.ts"]) {
  const source = fs.readFileSync(path.join(process.cwd(), sourcePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  fs.writeFileSync(path.join(tempDir, path.basename(sourcePath, ".ts") + ".js"), compiled);
}

const { encryptSecret, decryptSecret } = require(path.join(tempDir, "secret-vault.js"));
const { createApprovalRecord, verifyApprovalBinding } = require(path.join(tempDir, "approval.js"));
const { getEnvironmentReport, isValidAesKey } = require(path.join(tempDir, "env.js"));
let passed = 0;
function test(name, fn) { fn(); passed += 1; process.stdout.write(`PASS ${name}\n`); }

try {
  test("rejects absent or wrong-length encryption key", () => {
    delete process.env.ULTRON_ENCRYPTION_KEY_BASE64;
    assert.equal(isValidAesKey(undefined), false);
    assert.throws(() => encryptSecret("api-secret"));
  });
  process.env.ULTRON_ENCRYPTION_KEY_BASE64 = crypto.randomBytes(32).toString("base64");
  test("encrypts and decrypts secret with AES-256-GCM", () => {
    const payload = encryptSecret("test-secret");
    assert.equal(decryptSecret(payload), "test-secret");
    assert.notEqual(payload.ciphertext, "test-secret");
  });
  test("rejects modified ciphertext", () => {
    const payload = encryptSecret("test-secret");
    payload.ciphertext = Buffer.from("tampered").toString("base64");
    assert.throws(() => decryptSecret(payload));
  });
  test("approval binds exact action and expiry", () => {
    const action = { kind: "mission.create", summary: "Create test mission", payload: { priority: 2, name: "Alpha" } };
    const record = createApprovalRecord(action, new Date("2026-01-01T00:00:00.000Z"), 5000);
    record.status = "approved";
    assert.equal(verifyApprovalBinding(record, action, new Date("2026-01-01T00:00:01.000Z")), true);
    assert.equal(verifyApprovalBinding(record, { ...action, payload: { priority: 3, name: "Alpha" } }, new Date("2026-01-01T00:00:01.000Z")), false);
    assert.equal(verifyApprovalBinding(record, action, new Date("2026-01-01T00:00:06.000Z")), false);
  });
  test("rejects unapproved action kinds and unserializable payloads", () => {
    assert.throws(() => createApprovalRecord({ kind: "system.shell", summary: "Run command", payload: {} }));
    assert.throws(() => createApprovalRecord({ kind: "mission.create", summary: "Bad payload", payload: { bad: undefined } }));
  });
  test("health report reveals status only, not secrets", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dont-return-this";
    const report = getEnvironmentReport();
    assert.equal(JSON.stringify(report).includes("dont-return-this"), false);
    assert.equal(report.supabaseConfigured, false);
  });
  process.stdout.write(`${passed} security tests passed.\n`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.ULTRON_ENCRYPTION_KEY_BASE64;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
