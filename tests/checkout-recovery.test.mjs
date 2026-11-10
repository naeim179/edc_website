import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file,mocks,env={}) {
 const loaded={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module:loaded,exports:loaded.exports,require:n=>mocks[n],process:{env}});
 return loaded.exports;
}
function recovery({orders=[],attemptStatus='initiated',outcome='pending',user='student',remembered,settleBeforePendingRead=false}={}) {
 const calls=[],cleared=[];
 const db={from:table=>{const filters=[];return {select(){return this;},eq(k,v){filters.push([k,v]);return this;},async maybeSingle(){
  if(table==='paytabs_payment_attempts')return {data:{status:attemptStatus}};
  if(settleBeforePendingRead&&filters.some(([k,v])=>k==='status'&&v==='pending'))orders[0].status='paid';
  return {data:orders.find(o=>filters.every(([k,v])=>o[k]===v))??null};
 }};}};
 const action=load('app/actions/checkout-recovery.ts',{
  'next/headers':{cookies:async()=>({get:()=>remembered?{value:remembered}:undefined})},
  '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:user?{id:user}:null}})}})},
  '@/lib/supabase/admin':{createAdminClient:()=>db},
  '@/lib/checkout-recovery-cookie':{checkoutCookieName:id=>'checkout-return-'+id,clearHostedCheckout:async id=>cleared.push(id)},
  '@/lib/paytabs-reconciliation':{reconcileOwnedPaytabsOrder:async(id,owner)=>{calls.push({id,owner});const o=orders.find(x=>x.id===id);if(outcome==='paid')o.status='paid';if(outcome==='closed'){o.status='failed';o.paytabs_closed_cancelled_at='2026-11-10';}}},
 });
 return {...action,calls,cleared};
}
const pending=()=>({id:'a0000000-0000-4000-8000-000000000001',course_id:'course',user_id:'student',status:'pending',payment_method:'paytabs',source:'manual'});
test('Returning without paying preserves the live attempt and uses owner-scoped provider reconciliation',async()=>{
 const a=recovery({orders:[pending()]});const r=await a.inspectCheckoutPayment('course');assert.equal(r.state,'pending');assert.equal(r.orderId,'a0000000-0000-4000-8000-000000000001');assert.deepEqual(a.calls,[{id:'a0000000-0000-4000-8000-000000000001',owner:'student'}]);assert.equal(a.cleared.length,0);
});
test('An authenticated browser cannot inspect or reconcile another student’s hinted order',async()=>{
 const foreign={...pending(),id:'a0000000-0000-4000-8000-000000000002',user_id:'other',status:'paid'};const a=recovery({orders:[foreign],remembered:'a0000000-0000-4000-8000-000000000002'});assert.equal((await a.inspectCheckoutPayment('course','a0000000-0000-4000-8000-000000000002')).state,'ready');assert.equal(a.calls.length,0);
});
test('A hinted order from another course cannot report payment for this checkout',async()=>{
 const a=recovery({orders:[{...pending(),course_id:'other-course',status:'paid'}],remembered:'a0000000-0000-4000-8000-000000000001'});assert.equal((await a.inspectCheckoutPayment('course')).state,'ready');assert.equal(a.calls.length,0);
});
test('No session cannot inspect checkout state',async()=>{await assert.rejects(recovery({user:null}).inspectCheckoutPayment('course'),/Authentication required/);});
test('A verified closed unpaid attempt becomes ready without creating another order',async()=>{
 const a=recovery({orders:[pending()],outcome:'closed'});assert.equal((await a.inspectCheckoutPayment('course')).state,'ready');assert.deepEqual(a.cleared,['course']);
});
test('A restored checkout remembers its successful payment and goes to the course',async()=>{
 const a=recovery({orders:[{...pending(),status:'paid'}],remembered:'a0000000-0000-4000-8000-000000000001'});assert.equal((await a.inspectCheckoutPayment('course')).state,'paid');assert.equal(a.calls.length,0);assert.deepEqual(a.cleared,['course']);
});
test('An approval during verification reports paid, so queued checkout cannot buy twice',async()=>{
 const a=recovery({orders:[pending()],outcome:'paid'});assert.equal((await a.inspectCheckoutPayment('course')).state,'paid');
});
test('A closed private payment returns to schedule selection after the reservation is released',async()=>{
 const a=recovery({orders:[{...pending(),private_booking_id:'booking'}],outcome:'closed'});assert.equal((await a.inspectCheckoutPayment('course')).state,'reschedule');
});
test('A previously expired private attempt also requires fresh schedule selection',async()=>{
 const a=recovery({orders:[{...pending(),status:'failed',paytabs_closed_cancelled_at:'2026-11-10',private_booking_id:'booking'}],remembered:'a0000000-0000-4000-8000-000000000001'});assert.equal((await a.inspectCheckoutPayment('course')).state,'reschedule');
});
test('An unverified failed attempt remains a review case, never ready for another payment',async()=>{
 const a=recovery({orders:[{...pending(),status:'failed'}],remembered:'a0000000-0000-4000-8000-000000000001'});assert.equal((await a.inspectCheckoutPayment('course')).state,'review');assert.equal(a.calls.length,0);
});
test('A provider review cannot be released by returning in the browser',async()=>{
 const a=recovery({orders:[pending()],attemptStatus:'requires_review'});assert.equal((await a.inspectCheckoutPayment('course')).state,'review');
});
test('An existing CliQ transfer is left untouched',async()=>{
 const a=recovery({orders:[{...pending(),payment_method:'cliq'}]});assert.equal((await a.inspectCheckoutPayment('course')).state,'cliq');assert.equal(a.calls.length,0);
});
test('Checkout return marker is HttpOnly, secure in production, and scoped to checkout paths',async()=>{
 const written=[];const helper=load('lib/checkout-recovery-cookie.ts',{'next/headers':{cookies:async()=>({set:(...args)=>written.push(args)})}},{NODE_ENV:'production'});
 await helper.rememberHostedCheckout('course','a0000000-0000-4000-8000-000000000001');assert.equal(written[0][0],'checkout-return-course');assert.equal(written[0][1],'a0000000-0000-4000-8000-000000000001');assert.equal(written[0][2].httpOnly,true);assert.equal(written[0][2].secure,true);assert.equal(written[0][2].path,'/checkout');
 await helper.clearHostedCheckout('course');assert.equal(written[1][2].maxAge,0);assert.equal(written[1][2].path,'/checkout');
});

test('A callback settling between reads reports paid instead of authorizing a queued retry',async()=>{
 const a=recovery({orders:[pending()],remembered:'a0000000-0000-4000-8000-000000000001',settleBeforePendingRead:true});assert.equal((await a.inspectCheckoutPayment('course')).state,'paid');assert.equal(a.calls.length,0);
});
test('Malformed browser hints do not reach UUID database filters',async()=>{
 const a=recovery({remembered:'bad-id'});assert.equal((await a.inspectCheckoutPayment('course','also-bad')).state,'ready');
});

test('Recent verification is reused across tabs without repeating provider queries',async()=>{
 const a=recovery({orders:[{...pending(),paytabs_last_reconciled_at:new Date().toISOString()}]});assert.equal((await a.inspectCheckoutPayment('course')).state,'pending');assert.equal(a.calls.length,0);
});
