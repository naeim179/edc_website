import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function actions({fail=false}={}) {
 const calls=[];
 const admin={from:table=>({select(){return this;},or(){return this;},eq(){return this;},async maybeSingle(){return {data:table==='profiles'?{role:'student'}:table==='assignments'?{id:'a',course_id:'c',is_published:true}:table==='enrollments'?{id:'e'}:null};}}),rpc:async(name,args)=>{calls.push({name,args});return fail?{error:{message:'Submission is locked'}}:{data:{status:'submitted',attempt_number:1}};}};
 const mocks={'next/cache':{revalidatePath(){}},'@/lib/supabase/admin':{createAdminClient:()=>admin},'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'student'}}})}})}};
 const loaded={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../app/actions/assignment-submissions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:loaded,exports:loaded.exports,require:n=>mocks[n],URL});return {calls,...loaded.exports};
}
const content={text:'answer',links:[],files:[],audio:[]};
test('Submission delegates status and attempt counting to the atomic RPC',async()=>{const a=actions();const result=await a.submitAssignment('a',content);assert.equal(result.attemptNumber,1);assert.equal(a.calls[0].name,'write_assignment_submission');assert.equal(a.calls[0].args.p_submit,true);assert.equal(a.calls[0].args.p_student_id,'student');});
test('Draft saves use the same serialized transition with submit=false',async()=>{const a=actions();await a.saveAssignmentDraft('a',content);assert.equal(a.calls[0].args.p_submit,false);});
test('A stale draft rejected by the database cannot report success',async()=>{await assert.rejects(actions({fail:true}).saveAssignmentDraft('a',content),/Submission is locked/);});
test('Foreign file prefixes are still rejected before the RPC',async()=>{const a=actions();await assert.rejects(a.submitAssignment('a',{...content,files:[{path:'submissions/c/a/other/file.pdf',name:'file.pdf',size:1,type:'application/pdf'}]}),/Invalid storage path/);assert.equal(a.calls.length,0);});
