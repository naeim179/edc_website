import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function actions({ failure = null, canRead = true } = {}) {
 const calls = [];
 const caller = {
  auth: { getUser: async () => ({ data: { user: { id: "student" } } }) },
  from: table => ({
   select() { return this; }, eq() { return this; },
   async maybeSingle() {
    return { data: table === "profiles" ? { role: "student" } : canRead ? { id: "a", course_id: "c" } : null };
   },
  }),
 };
 const admin = { rpc: async (name, args) => {
  calls.push({ name, args });
  return failure ? { error: { message: failure } } : { data: { status: "submitted", attempt_number: 1 } };
 } };
 const mocks = {
  "next/cache": { revalidatePath() {} },
  "@/lib/supabase/admin": { createAdminClient: () => admin },
  "@/lib/supabase/server": { createClient: async () => caller },
 };
 const loaded = { exports: {} };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../app/actions/assignment-submissions.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
 }).outputText, { module: loaded, exports: loaded.exports, require: name => mocks[name], URL });
 return { calls, ...loaded.exports };
}
const content={text:'answer',links:[],files:[],audio:[]};
test('Submission delegates status and attempt counting to the atomic RPC',async()=>{const a=actions();const result=await a.submitAssignment('a',content);assert.equal(result.attemptNumber,1);assert.equal(a.calls[0].name,'write_assignment_submission');assert.equal(a.calls[0].args.p_submit,true);assert.equal(a.calls[0].args.p_student_id,'student');});
test('Draft saves use the same serialized transition with submit=false',async()=>{const a=actions();await a.saveAssignmentDraft('a',content);assert.equal(a.calls[0].args.p_submit,false);});
test('A stale draft rejected by the database cannot report success',async()=>{await assert.rejects(actions({failure:'Submission is locked'}).saveAssignmentDraft('a',content),/Submission is locked/);});
test('Foreign file prefixes are still rejected before the RPC',async()=>{const a=actions();await assert.rejects(a.submitAssignment('a',{...content,files:[{path:'submissions/c/a/other/file.pdf',name:'file.pdf',size:1,type:'application/pdf'}]}),/Invalid storage path/);assert.equal(a.calls.length,0);});


test("A student cannot send a draft or submission when the assignment is hidden by RLS", async () => {
 const a = actions({ canRead: false });
 for (const method of [a.saveAssignmentDraft, a.submitAssignment]) {
  const result = await method("a", content);
  assert.equal(result.success, false);
  assert.equal(result.error, "access_required");
 }
 assert.equal(a.calls.length, 0);
});

test("The write action reports access lost during an already-open edit", async () => {
 const a = actions({ failure: "ASSIGNMENT_ACCESS_REQUIRED" });
 const result = await a.submitAssignment("a", content);
 assert.equal(result.success, false);
 assert.equal(result.error, "access_required");
 assert.equal(a.calls.length, 1);
});
