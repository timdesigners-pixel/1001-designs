import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createService, verifyWebhook, isPaidSubscription } from './server.mjs';

test('webhook verifies exact raw body, rotated signatures, timestamp and tampering', () => {
  const raw = Buffer.from('{"id":"evt_test"}'), time = Math.floor(Date.now()/1000);
  const sig = createHmac('sha256','test-secret').update(time+'.').update(raw).digest('hex');
  assert.equal(verifyWebhook(raw,'t='+time+',v1='+sig,'test-secret'),true);
  assert.equal(verifyWebhook(raw,'t='+time+',v1=bad,v1='+sig,'test-secret'),true);
  assert.equal(verifyWebhook(Buffer.from('{}'),'t='+time+',v1='+sig,'test-secret'),false);
  assert.equal(verifyWebhook(raw,'t='+time+',v1='+sig,'test-secret',Date.now()+400000),false);
  assert.equal(verifyWebhook(raw,'t='+time+',v1='+sig,''),false);
});
test('only active, unexpired subscriptions of the configured price are paid', () => {
  const item = { price: { id:'price_pro' },current_period_end:Math.floor(Date.now()/1000)+3600 };
  const sub = { status:'active', items: { data:[item] } };
  assert.equal(isPaidSubscription(sub,'price_pro'),true);
  for (const status of ['trialing','past_due','canceled','unpaid','incomplete']) assert.equal(isPaidSubscription({...sub,status},'price_pro'),false);
  assert.equal(isPaidSubscription(sub,'price_other'),false);
  assert.equal(isPaidSubscription({...sub,items:{data:[{...item,current_period_end:1}]}},'price_pro'),false);
});
test('accounts, payment enforcement, quota, failure refund, cancellation and logout', async () => {
  let paid = false, failModel = false, stripeCalls = 0;
  const env = { DB_PATH:':memory:', ALLOWED_ORIGINS:'chrome-extension://test', STRIPE_SECRET_KEY:'test',
    STRIPE_PRICE_ID:'price_pro', OPENAI_API_KEY:'test', MONTHLY_ADAPT_LIMIT:'1' };
  const mockFetch = async (url) => {
    if (url.includes('api.stripe.com')) {
      stripeCalls++;
      if (url.endsWith('/customers')) return Response.json({id:'cus_test'});
      if (url.includes('/checkout/sessions')) return Response.json({url:'https://checkout.stripe.com/test'});
      if (url.includes('/subscriptions?')) return Response.json({data:paid ? [{status:'active',items:{data:[{price:{id:'price_pro'},current_period_end:Math.floor(Date.now()/1000)+3600}]}}] : []});
    }
    if (url.includes('api.openai.com')) {
      if (failModel) return new Response('{}',{status:500});
      return Response.json({choices:[{finish_reason:'stop',message:{content:'<!doctype html><html><body><main>Adapted</main></body></html>'}}]});
    }
    throw new Error('Unexpected outbound request');
  };
  const server = createService(env,{fetch:mockFetch});
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  const base = 'http://127.0.0.1:'+server.address().port;
  let token = '';
  const request = (path,data,origin) => fetch(base+path,{ method:data===undefined?'GET':'POST',
    headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})},
    body:data===undefined?undefined:JSON.stringify(data) });
  try {
    assert.equal((await request('/health',undefined,'https://evil.example')).status,403);
    assert.equal((await request('/health',undefined,'chrome-extension://test')).status,200);
    assert.equal((await (await request('/v1/me')).json()).pro,false);
    assert.equal((await request('/v1/adapt',{})).status,401);
    assert.equal((await request('/v1/auth/register',{email:'invalid',password:'short'})).status,400);
    const registered = await request('/v1/auth/register',{email:'demo@example.com',password:'correct-long-password'});
    assert.equal(registered.status,200); token=(await registered.json()).token;
    assert.equal((await (await request('/v1/me')).json()).pro,false);
    assert.equal((await request('/v1/adapt',{})).status,403);
    const checkout = await request('/v1/billing/checkout',{});
    assert.equal(checkout.status,200);
    assert.equal((await (await request('/v1/me')).json()).pro,false,'checkout URL must never grant Pro');
    paid=true;
    assert.equal((await (await request('/v1/me')).json()).pro,true);
    assert.equal((await request('/v1/adapt',{document:'invalid'})).status,400);
    const input={document:'<html><body><main>Original</main></body></html>',component:{html:'<section>New</section>'},target:'main',placement:'append',mode:'design-to-content',content:'hello',provider:'openai'};
    failModel=true;
    assert.equal((await request('/v1/adapt',input)).status,502);
    failModel=false;
    assert.equal((await request('/v1/adapt',input)).status,200,'failed upstream request refunds quota');
    assert.equal((await request('/v1/adapt',input)).status,429);
    paid=false;
    assert.equal((await request('/v1/adapt',input)).status,403,'cancellation is checked online');
    assert.ok(stripeCalls>3);
    await request('/v1/auth/logout',{});
    assert.equal((await request('/v1/adapt',input)).status,401);
    token='';
    const login = await request('/v1/auth/login',{email:'demo@example.com',password:'correct-long-password'});
    assert.equal(login.status,200);
    assert.equal((await request('/v1/auth/login',{email:'demo@example.com',password:'incorrect-password'})).status,401);
  } finally { await new Promise(r=>server.close(r)); }
});
