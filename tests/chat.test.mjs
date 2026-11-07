import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file,mocks={}) {
 const source=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const loadedModule={exports:{}};
 vm.runInNewContext(source,{module:loadedModule,exports:loadedModule.exports,require:n=>{if(n in mocks)return mocks[n];throw new Error('Unexpected dependency '+n)},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co'}},URL,console});
 return loadedModule.exports;
}
const attachments=load('lib/chat-attachments.ts');
const conversation='c1000000-0000-4000-8000-000000000001';
test('Attachment paths accept this conversation and renew old signed URLs without trusting their tokens',()=>{
 assert.equal(attachments.chatAttachmentPath(conversation+'/one.pdf',conversation),conversation+'/one.pdf');
 assert.equal(attachments.chatAttachmentPath('https://test.supabase.co/storage/v1/object/sign/chat-files/'+conversation+'/one.pdf?token=expired',conversation),conversation+'/one.pdf');
 for(const url of ['javascript:alert(1)','https://foreign.test/'+conversation+'/one.pdf','https://foreign.test/storage/v1/object/sign/chat-files/'+conversation+'/one.pdf',conversation+'/../other.pdf','other/file.pdf',conversation+'/a\\b.pdf']) assert.equal(attachments.chatAttachmentPath(url,conversation),null,url);
});
test('Attachment file limits reject empty, oversized and executable formats',()=>{
 for(const [name,size] of [['test.pdf',1],['photo.png',10485760],['work.docx',10],['file.zip',100]])assert.equal(attachments.validChatFile(name,size),true);
 for(const [name,size] of [['test.pdf',0],['test.pdf',10485761],['test.html',10],['test.svg',10],['test.pdf',NaN]])assert.equal(attachments.validChatFile(name,size),false);
});
test('Deleted and foreign attachments are never signed, while legacy links get fresh URLs',async()=>{
 let requested;
 const supabase={storage:{from:()=>({createSignedUrls:async paths=>{requested=paths;return {data:paths.map(path=>({path,signedUrl:'https://new-link.test/'+path}))}}})}};
 const rows=[{conversation_id:conversation,deleted_at:null,attachment_url:conversation+'/one.pdf'},{conversation_id:conversation,deleted_at:'now',attachment_url:conversation+'/secret.pdf'},{conversation_id:conversation,deleted_at:null,attachment_url:'https://foreign.test/unsafe.pdf'}];
 const result=await attachments.signChatAttachments(supabase,rows);
 assert.equal(requested.length,1);assert.equal(result[1].attachment_url,null);assert.equal(result[2].attachment_url,null);assert.match(result[0].attachment_url,/new-link/);
});
function actions(result) {
 const invalidations=[];
 const query={update(){return this},select(){return this},eq(){return this},is(){return this},async maybeSingle(){return result}};
 const supabase={auth:{getUser:async()=>({data:{user:{id:'sender'}}})},from:()=>query};
 return {api:load('app/actions/chat.ts',{'next/cache':{revalidatePath:p=>invalidations.push(p)},'@/lib/supabase/server':{createClient:async()=>supabase},'@/lib/chat':{getMessages:async()=>[]},'@/lib/chat-attachments':attachments}),invalidations};
}
test('Editing or deleting a missing/foreign/deleted row must fail instead of reporting success',async()=>{
 const {api}=actions({data:null,error:null});
 await assert.rejects(api.editMessage('not-owned','New text'));
 await assert.rejects(api.deleteMessage('not-owned'));
 await assert.rejects(api.editMessage('id','x'.repeat(4001)));
});
test('A successful edit invalidates thread, participant inbox and admin preview',async()=>{
 const {api,invalidations}=actions({data:{id:'message',conversation_id:conversation},error:null});
 await api.editMessage('message','Edited');
 assert.deepEqual(invalidations,[`/messages/${conversation}`,'/messages','/admin/messages']);
});

test('Realtime authenticates the user before joining a chat channel',async()=>{
 const {subscribeChat}=load('lib/chat-realtime.ts');const events=[];
 const client={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}},error:null})},realtime:{setAuth:async token=>events.push('auth:'+token)},removeChannel:()=>events.push('removed')};
 const dispose=subscribeChat(client,{subscribe:()=>events.push('subscribed')},()=>{});
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,['auth:fixture-token','subscribed']);dispose();assert.equal(events.at(-1),'removed');
});
test('Realtime never joins as anon or after the component has unmounted',async()=>{
 const {subscribeChat}=load('lib/chat-realtime.ts');let joined=false,status;
 subscribeChat({auth:{getSession:async()=>({data:{session:null},error:null})},removeChannel(){}},{subscribe:()=>{joined=true}},s=>{status=s});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(joined,false);assert.equal(status,'CHANNEL_ERROR');
 let finish;const pending=new Promise(resolve=>{finish=resolve});
 const dispose=subscribeChat({auth:{getSession:()=>pending},realtime:{setAuth:async()=>{}},removeChannel(){}},{subscribe:()=>{joined=true}},()=>{});dispose();finish({data:{session:{access_token:'fixture'}}});await new Promise(resolve=>setImmediate(resolve));assert.equal(joined,false);
});

test('A storage outage leaves text messages readable and hides unavailable links',async()=>{
 const rows=[{conversation_id:conversation,deleted_at:null,attachment_url:conversation+'/one.pdf',content:'Keep this caption'},{conversation_id:conversation,deleted_at:null,attachment_url:null,content:'Text stays available'}];
 const result=await attachments.signChatAttachments({storage:{from:()=>({createSignedUrls:async()=>({data:null,error:{message:'offline'}})})}},rows);
 assert.equal(result[0].attachment_url,null);assert.equal(result[0].content,'Keep this caption');assert.equal(result[1].content,'Text stays available');
});
