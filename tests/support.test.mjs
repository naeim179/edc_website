import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,mocks={},globals={}) {
 const code=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const m={exports:{}};
 vm.runInNewContext(code,{module:m,exports:m.exports,require:name=>mocks[name]??(name==='./types'?load('lib/support/types.ts'):name==='@/lib/support/validation'?load('lib/support/validation.ts'):require(name)),Request,Response,URL,Uint8Array,Set,Number,Date,...globals});
 return m.exports;
}
const validation=load('lib/support/validation.ts');
const id='80000000-0000-4000-8000-000000000001';
const create={requestId:id,title:'Payment issue',body:'A clear description of the issue.',category:'payment'};
test('Support validation bounds text, categories, UUID references and file counts',()=>{
 assert.equal(validation.validCreate(create),true);
 for(const patch of [{title:'x'},{body:'short'},{body:'x'.repeat(5001)},{title:'x'.repeat(161)},{category:'admin'},{requestId:'bad'},{courseId:'bad'},{orderId:'bad'}]) assert.equal(validation.validCreate({...create,...patch}),false);
 assert.equal(validation.validReply({requestId:id,body:'',internal:false,fileIds:[id]}),true);
 for(const patch of [{body:'',fileIds:[]},{internal:'true'},{fileIds:[id,id]},{fileIds:['bad']},{body:'x'.repeat(5001)}]) assert.equal(validation.validReply({requestId:id,body:'Reply',internal:false,fileIds:[],...patch}),false);
 assert.equal(validation.validUpdate({version:1,status:'closed',priority:'normal',assignee:null}),true);
 for(const patch of [{version:0},{version:Infinity},{status:'fake'},{priority:'fake'},{assignee:'bad'}]) assert.equal(validation.validUpdate({version:1,status:'closed',priority:'normal',assignee:null,...patch}),false);
});
test('Support attachment sniffing rejects HTML/SVG and identifies PNG, JPEG and PDF',()=>{
 assert.equal(validation.supportMime(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
 assert.equal(validation.supportMime(new Uint8Array([255,216,255,0])),'image/jpeg');
 assert.equal(validation.supportMime(new TextEncoder().encode('%PDF-1.4')),'application/pdf');
 for(const content of ['<svg></svg>','<html>fake.pdf</html>','', 'plain text']) assert.equal(validation.supportMime(new TextEncoder().encode(content)),null);
});
function actions({user={id},rpcError=null,authThrows=false}={}) {
 const calls=[];const paths=[];
 const a=load('app/actions/support.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>{if(authThrows)throw Error('offline');return {data:{user}}}},rpc:async(name,args)=>{calls.push({name,args});return {data:name==='support_create_ticket'?id:true,error:rpcError}}})},'next/cache':{revalidatePath:p=>paths.push(p)}});
 return {a,calls,paths};
}
test('Every support action validates authentication before any database operation',async()=>{
 const {a,calls}=actions({user:null});
 for(const run of [()=>a.listSupportTickets(true),()=>a.getSupportTicket(id,false),()=>a.createSupportTicket(create),()=>a.replySupportTicket(id,{requestId:id,body:'Reply',internal:false,fileIds:[]}),()=>a.updateSupportTicket(id,{version:1,status:'closed',priority:'normal',assignee:null}),()=>a.markSupportRead(id,new Date().toISOString())]) assert.equal((await run()).error,'unauthorized');
 assert.equal(calls.length,0);
});
test('Creation derives identity from the session, sends only accepted fields and refreshes both views',async()=>{
 const {a,calls,paths}=actions();const result=await a.createSupportTicket({...create,title:'  Payment issue  ',created_by:'foreign-user',status:'resolved',priority:'urgent'});
 assert.equal(result.ok,true);assert.equal(calls[0].args.p_title,'Payment issue');
 assert.equal(calls[0].args.created_by,undefined);assert.equal(calls[0].args.status,undefined);assert.equal(calls[0].args.priority,undefined);
 assert.ok(paths.includes('/support')&&paths.includes('/admin/support'));
});
test('Malformed support actions never reach PostgreSQL',async()=>{
 const {a,calls}=actions();
 assert.equal((await a.createSupportTicket({...create,category:'bad'})).error,'invalid');
 assert.equal((await a.getSupportTicket('bad',false)).error,'invalid');
 assert.equal((await a.replySupportTicket(id,{requestId:id,body:'',internal:false,fileIds:[]})).error,'invalid');
 assert.equal((await a.markSupportRead(id,'invalid')).error,'invalid');assert.equal(calls.length,0);
});
for(const [message,error] of [['SUPPORT_STALE','stale'],['SUPPORT_RATE_LIMIT','rate_limit'],['SUPPORT_REOPEN_REQUIRED','reopen'],['SUPPORT_REFERENCE_INVALID','reference'],['SUPPORT_ATTACHMENT_INVALID','attachment'],['SUPPORT_ATTACHMENT_EXPIRED','attachment_expired'],['SUPPORT_ASSIGNEE_INVALID','assignee'],['internal database connection details','unavailable']]) test(`Support errors are localized codes without leaking database details: ${error}`,async()=>{
 const {a,paths}=actions({rpcError:{message}}); const r=await a.createSupportTicket(create);assert.equal(r.error,error);assert.equal(paths.length,0);assert.equal(JSON.stringify(r).includes('database connection'),false);
});
test('Support authentication outages are retryable without leaking server errors',async()=>assert.equal((await actions({authThrows:true}).a.createSupportTicket(create)).error,'unavailable'));
test('Support upload rejects foreign origins, missing auth, oversized streams and spoofed content before reserving storage',async()=>{
 const calls=[];const route=load('app/api/support/attachments/route.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:{id}}})},rpc:async()=>{calls.push(1);throw Error('Unexpected reservation')}})}});
 const base=`https://academy.example/api/support/attachments?ticket=${id}`;
 const request=(origin,body,headers={})=>new Request(base,{method:'POST',headers:{origin,'x-file-name':'proof.pdf',...headers},body});
 assert.equal((await route.POST(request('https://evil.example','%PDF-'))).status,403);
 assert.equal((await route.POST(request('https://academy.example','fake PDF'))).status,415);
 assert.equal((await route.POST(request('https://academy.example','%PDF-',{'content-length':String(validation.MAX_SUPPORT_FILE_BYTES+1)}))).status,413);
 assert.equal((await route.POST(request('https://academy.example',new Uint8Array(validation.MAX_SUPPORT_FILE_BYTES+1)))).status,413);
 assert.equal(calls.length,0);
});
test('Private attachment download uses the authenticated RLS client and short lived download-only URL',async()=>{
 let selection=[];let signed;
 const route=load('app/api/support/attachments/[id]/route.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:{id}}})},from:table=>({select(fields){selection.push([table,fields]);return this},eq(){return this},maybeSingle:async()=>({data:{path:'private/proof',name:'proof.pdf',state:'linked'}})}),storage:{from:bucket=>({createSignedUrl:async(...args)=>{signed={bucket,args};return {data:{signedUrl:'https://storage.example/signed'}}}})}})}});
 const r=await route.GET(new Request('https://academy.example'),{params:Promise.resolve({id})});
 assert.equal(r.status,302);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(signed.bucket,'support-files');assert.equal(signed.args[1],60);assert.equal(signed.args[2].download,'proof.pdf');assert.equal(selection[0][0],'support_attachments');
});

test('Support downloads normalize executable or spoofed filenames to the validated media type',()=>{
 assert.equal(validation.supportFilename('proof.html','image/png'),'proof.png');
 assert.equal(validation.supportFilename('report.exe','application/pdf'),'report.pdf');
 assert.equal(validation.supportFilename('photo.jpeg','image/jpeg'),'photo.jpg');
 assert.ok(!validation.supportFilename('../evil\u202efile.html','image/png').includes('\u202e'));
});

test('Upload origin checks handle internal bind addresses and reverse proxies without trusting forwarded-host',()=>{
 const r=headers=>new Request('http://0.0.0.0:3000/api/support/attachments',{headers});
 assert.equal(validation.supportSameOrigin(r({origin:'http://localhost:3000',host:'localhost:3000'})),true);
 assert.equal(validation.supportSameOrigin(r({origin:'https://academy.example',host:'academy.example','x-forwarded-proto':'https'})),true);
 assert.equal(validation.supportSameOrigin(r({origin:'https://evil.example',host:'academy.example','x-forwarded-proto':'https','x-forwarded-host':'evil.example'})),false);
 assert.equal(validation.supportSameOrigin(r({origin:'https://academy.example',host:'academy.example','x-forwarded-proto':'https','sec-fetch-site':'cross-site'})),false);
 for(const origin of ['null','https://evil.example','https://academy.example/path']) assert.equal(validation.supportSameOrigin(r({origin,host:'academy.example','x-forwarded-proto':'https'})),false);
});
