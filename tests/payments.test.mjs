import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHmac, webcrypto } from 'node:crypto';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, mocks = {}, env = {}, globals = {}) {
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url),'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports,
    require: name => mocks[name] ?? require(name), process: {env}, URL, URLSearchParams,
    TextEncoder, Uint8Array, crypto: webcrypto, AbortSignal, console, ...globals });
  return loadedModule.exports;
}
const env = {PAYTABS_SERVER_KEY:'sandbox-unit-secret',PAYTABS_PROFILE_ID:'123',SITE_URL:'https://academy.example'};
const cart = 'a0000000-0000-4000-8000-000000000001';
const order = {id:'order',user_id:'student',course_id:'course'};
const approved = {tran_ref:'T1',cart_id:cart,cart_amount:'25.00',cart_currency:'usd',payment_result:{response_status:'A'}};
function payment(result = approved, options = {}) {
  const calls=[];
  const admin = {from: table => ({select(){return this;},eq(){return this;},
    async maybeSingle(){return {data:table==='orders'?order:{id:cart,order_id:order.id}};},
    async upsert(value){calls.push(['review',value]);return {};}}),
    async rpc(name,args){calls.push([name,args]);if(options.rpcError)return {error:{message:'offline'}};
      return {data:[{result_state:options.review?'review':'paid',subscription_expires_at:'2027-01-01',subscription_auto_renew:false}]};}};
  const {fulfillPaymentByTranRef:fulfill} = load('lib/payments.ts',{
    '@/lib/supabase/admin':{createAdminClient:()=>admin},
    '@/lib/paytabs':{queryTransaction:async()=>result}
  });
  return {fulfill,calls};
}
test('Approval uses verified amount, currency and immutable attempt',async()=>{
  const {fulfill,calls}=payment(); assert.equal((await fulfill('T1',null,'student')).paid,true);
  assert.equal(calls[0][1].p_amount,25);assert.equal(calls[0][1].p_currency,'USD');assert.equal(calls[0][1].p_attempt_id,cart);
});
for (const status of ['D','C','P','H','E',undefined]) test(`Status ${status} never grants access`,async()=>{
  const {fulfill,calls}=payment({...approved,payment_result:{response_status:status}});
  assert.equal((await fulfill('T1')).paid,false);assert.equal(calls.length,0);
});
for (const ref of [undefined,'OTHER']) test(`Query reference ${ref} fails closed`,async()=>{
  const {fulfill,calls}=payment({...approved,tran_ref:ref});
  await assert.rejects(fulfill('T1'),/reference mismatch/);assert.equal(calls.length,0);
});
test('A student cannot process another student payment',async()=>{
  const {fulfill,calls}=payment();assert.equal((await fulfill('T1',null,'outsider')).paid,false);assert.equal(calls.length,0);
});
for(const amount of [0,-1,'invalid',null]) test(`Invalid approved amount ${amount} is reviewed`,async()=>{
  const {fulfill,calls}=payment({...approved,cart_amount:amount});assert.equal((await fulfill('T1')).paid,false);assert.equal(calls[0][0],'review');
});
test('Malformed cart is recorded for review without enrollment',async()=>{
  const {fulfill,calls}=payment({...approved,cart_id:'invalid'});assert.equal((await fulfill('T1')).paid,false);assert.equal(calls[0][0],'review');
});
test('Database review does not report success',async()=>{assert.equal((await payment(approved,{review:true}).fulfill('T1')).paid,false);});
test('Database outages propagate so callbacks can retry',async()=>{await assert.rejects(payment(approved,{rpcError:true}).fulfill('T1'),/offline/);});

test('Callback HMAC accepts exact raw body and rejects tampering or missing secret',async()=>{
 const raw='{"tran_ref":"T1"}';const sig=createHmac('sha256',env.PAYTABS_SERVER_KEY).update(raw).digest('hex');
 const {verifyPayTabsCallbackSignature:verify}=load('lib/paytabs.ts',{},env);
 assert.equal(await verify(raw,sig),true);assert.equal(await verify(raw+' ',sig),false);assert.equal(await verify(raw,null),false);
 assert.equal(await load('lib/paytabs.ts').verifyPayTabsCallbackSignature(raw,sig),false);
});
for (const operation of ['createPaymentPage','queryTransaction','createRecurringPayment']) test(`${operation} uses bounded provider requests`,async()=>{
 let request;
 const gateway=load('lib/paytabs.ts',{},env,{fetch:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({redirect_url:'https://secure-jordan.paytabs.com/pay',tran_ref:'T1'})};}});
 await gateway[operation](operation==='queryTransaction'?'T1':{orderId:'order',amount:25,currency:'USD',siteUrl:env.SITE_URL});
 assert.ok(request.signal instanceof AbortSignal);assert.equal(request.method,'POST');
 const body=JSON.parse(request.body);assert.equal(body.profile_id,123);
 if(operation==='createPaymentPage'){assert.equal(body.paypage_ttl,5);assert.equal(body.callback,env.SITE_URL+'/api/payments/webhook');}
});
const nextServer={NextResponse:{json:(body,init)=>Response.json(body,init),redirect:(url,status)=>Response.redirect(url,status)}};
function webhook(valid=true,fail=false){const calls=[];const route=load('app/api/payments/webhook/route.ts',{
 'next/server':nextServer,'@/lib/paytabs':{verifyPayTabsCallbackSignature:async()=>valid},
 '@/lib/payments':{fulfillPaymentByTranRef:async(...args)=>{calls.push(args);if(fail)throw Error('offline');}}
 });return {post:body=>route.POST(new Request('https://academy.example/api/payments/webhook',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})),calls};}
test('Unsigned callback is rejected before fulfillment',async()=>{const {post,calls}=webhook(false);assert.equal((await post({tran_ref:'T1'})).status,401);assert.equal(calls.length,0);});
for(const ref of [null,{},[],22,' ', 'x'.repeat(257)])test(`Malformed callback reference ${typeof ref} returns 400`,async()=>{const {post,calls}=webhook();assert.equal((await post({tran_ref:ref})).status,400);assert.equal(calls.length,0);});
test('Verified callback is acknowledged; database failure asks provider to retry',async()=>{assert.equal((await webhook().post({tran_ref:'T1'})).status,200);assert.equal((await webhook(true,true).post({tran_ref:'T1'})).status,500);});
test('Unsigned return query never changes payment state',async()=>{
 const route=load('app/api/payments/return/route.ts',{'next/server':nextServer,'@/lib/supabase/admin':{createAdminClient(){throw Error('Must not write');}}},env);
 const res=await route.GET({nextUrl:new URL('https://academy.example/api/payments/return?tran_ref=T1&respStatus=A&cancelled=1')});
 assert.equal(res.status,303);assert.equal(res.headers.get('location'),env.SITE_URL+'/checkout/success?tranRef=T1');
});
for(const file of ['app/api/payments/reconcile/route.ts','app/api/subscriptions/renew/route.ts'])test(`${file} rejects unauthorized scheduling calls`,async()=>{
 const mocks={'next/server':nextServer,'@/lib/supabase/admin':{createAdminClient(){throw Error('Must not access database');}},'@/lib/paytabs':{},'@/lib/payments':{}};
 assert.equal((await load(file,mocks,{CRON_SECRET:'test'}).GET(new Request('https://academy.example'))).status,401);
 assert.equal((await load(file,mocks).GET(new Request('https://academy.example'))).status,503);
});

function renewal({status='D',mismatch=false,throws=false}={}) {
 const calls=[];const claim={subscription_id:'sub',student_id:'student',course_id:'course',duration_months:1,amount:25,currency:'USD',token:'test-token',token_tran_ref:'ORIGINAL'};
 const admin={async rpc(name){calls.push(name);return {data:name==='claim_due_subscription_renewals'?[claim]:null};},
  from(){return {insert(){return this;},select(){return this;},eq(){return this;},
   async single(){return {data:{id:'renewal-order'}};},update(){calls.push('mark-failed');return this;},async maybeSingle(){return {data:{id:'renewal-order'}};},
   async upsert(value){calls.push(value.reason);return {};}};}};
 const route=load('app/api/subscriptions/renew/route.ts',{'next/server':nextServer,
 '@/lib/supabase/admin':{createAdminClient:()=>admin},'@/lib/payments':{fulfillPaymentByTranRef:async()=>({paid:false})},
 '@/lib/paytabs':{createRecurringPayment:async()=>{if(throws)throw Error('timeout');return {tran_ref:'R1'};},queryTransaction:async()=>({tran_ref:'R1',cart_id:mismatch?'foreign-order':'renewal-order',cart_amount:25,cart_currency:'USD',payment_result:{response_status:status}})}
 },{CRON_SECRET:'test'});
 return {calls,run:()=>route.GET(new Request('https://academy.example',{headers:{authorization:'Bearer test'}}))};
}
test('Verified recurring decline closes only its matching order and records a failure',async()=>{const {calls,run}=renewal();assert.equal((await run()).status,200);assert.ok(calls.includes('mark-failed'));assert.ok(calls.includes('record_subscription_renewal_failure'));});
for(const options of [{status:'P'},{status:'H'},{status:'A'},{mismatch:true},{throws:true}])test(`Ambiguous recurring result is preserved for review ${JSON.stringify(options)}`,async()=>{
 const {calls,run}=renewal(options);assert.equal((await run()).status,200);assert.ok(calls.includes('RENEWAL_RESULT_UNCERTAIN'));assert.ok(!calls.includes('mark-failed'));assert.ok(!calls.includes('record_subscription_renewal_failure'));
});

function checkoutResult({closed=false,owner=true,signedIn=true}={}) {
 const filters={};const client={auth:{getUser:async()=>({data:{user:signedIn?{id:'student'}:null}})},from:()=>({
  select(){return this;},eq(key,value){filters[key]=value;return this;},async maybeSingle(){return {data:owner&&closed?{course_id:'course',paytabs_closed_cancelled_at:'2026-11-07'}:null};}
 })};
 const page=load('app/checkout/success/page.tsx',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/payments':{},'@/components/CliqPaymentUpload':{__esModule:true,default:()=>null},'next/link':{__esModule:true,default:()=>null}}).default;
 return {filters,render:()=>page({searchParams:Promise.resolve({cancelled:'1',order:'order',course:'course'})})};
}
function jsxText(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(jsxText).join(' ');return jsxText(node.props?.children);}
for(const options of [{},{closed:true,owner:false},{closed:true,signedIn:false}])test(`Edited cancellation URL does not claim verified cancellation ${JSON.stringify(options)}`,async()=>{
 assert.ok(!jsxText(await checkoutResult(options).render()).includes('تم تأكيد الإلغاء'));
});
test('Confirmed cancellation is shown only after owner and closed-state lookup',async()=>{
 const {render,filters}=checkoutResult({closed:true});assert.ok(jsxText(await render()).includes('تم تأكيد الإلغاء'));assert.equal(filters.user_id,'student');assert.equal(filters.status,'failed');assert.equal(filters.payment_method,'paytabs');
});

test('Signed cancellation requires provider verification and returns the closed order identity',async()=>{
 const fields={tranRef:'C1',cartId:cart,respStatus:'C'};
 const canonical=new URLSearchParams(Object.entries(fields).sort(([a],[b])=>a.localeCompare(b))).toString();
 fields.signature=createHmac('sha256',env.PAYTABS_SERVER_KEY).update(canonical).digest('hex');
 let closed=0;const route=load('app/api/payments/return/route.ts',{'next/server':nextServer,
 '@/lib/supabase/admin':{createAdminClient:()=>({from:table=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:table==='orders'?{id:'order',course_id:'course'}:{id:cart,order_id:'order'}};}}),async rpc(){closed++;return {data:true};}})}
 },env,{fetch:async()=>({ok:true,json:async()=>[{tran_ref:'C1',cart_id:cart,payment_result:{response_status:'C'}}]})});
 const response=await route.POST(new Request('https://academy.example/api/payments/return',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)}));
 assert.equal(closed,1);const location=new URL(response.headers.get('location'));assert.equal(location.searchParams.get('cancelled'),'1');assert.equal(location.searchParams.get('order'),'order');
});
