(()=>{var a={};a.id=2898,a.ids=[2898],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},37005:()=>{},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55565:()=>{},61166:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>I,patchFetch:()=>H,routeModule:()=>D,serverHooks:()=>G,workAsyncStorage:()=>E,workUnitAsyncStorage:()=>F});var d={};c.r(d),c.d(d,{GET:()=>B,POST:()=>C,dynamic:()=>A,runtime:()=>z});var e=c(50850),f=c(18523),g=c(666),h=c(124),i=c(21058),j=c(261),k=c(57396),l=c(88126),m=c(3510),n=c(59365),o=c(58067),p=c(69545),q=c(11711),r=c(70840),s=c(86439),t=c(28806),u=c(73283),v=c(96048),w=c(77333),x=c(65936),y=c(61447);let z="nodejs",A="force-dynamic";async function B(){let{data:a,error:b}=await v.E.from("clients").select("id, name, slug, subdomain, domain, tier, status, contact_email, contact_name, monthly_fee_cents, primary_color, secondary_color, api_quota, created_at, client_features(flag, enabled)").is("deleted_at",null).order("created_at",{ascending:!1});return b?(console.error("[clients] list failed",b),u.NextResponse.json({error:b.message},{status:500})):u.NextResponse.json({clients:a})}async function C(a){let b;try{b=await a.json()}catch{return u.NextResponse.json({error:"Invalid JSON"},{status:400})}let{name:c,slug:d,legal_name:e,contact_email:f,contact_name:g,ncr_number:h,tier:i,monthly_fee_cents:j,primary_color:k,secondary_color:l,support_email:m,features:n}=b;if(!c||!d||!f||!i)return u.NextResponse.json({error:"name, slug, contact_email, and tier are required"},{status:422});if(!/^[a-z0-9-]+$/.test(d))return u.NextResponse.json({error:"slug must be lowercase alphanumeric with hyphens only"},{status:422});let{data:o,error:p}=await v.E.from("clients").insert({name:c,slug:d,subdomain:d,domain:b.domain??null,legal_name:e??null,contact_email:f,contact_name:g??null,ncr_number:h??null,tier:i,status:"trial",monthly_fee_cents:j,primary_color:k,secondary_color:l,support_email:m??null,supabase_url:b.supabase_url??null,supabase_service_key:b.supabase_service_key??null,vercel_project_id:b.vercel_project_id??null}).select().single();if(p){console.error("[clients] insert failed",p);let a="23505"===p.code;return u.NextResponse.json({error:a?`A client with slug "${d}" already exists.`:p.message},{status:a?409:500})}let q=w.o.map(a=>({client_id:o.id,flag:a,enabled:n[a]??!1,enabled_at:n[a]?new Date().toISOString():null})),{error:r}=await v.E.from("client_features").insert(q);r&&console.error("[clients] feature seed failed",r);let s=!1;if(b.marketplace_opt_in){let a=b.marketplace_config?.max_amount_cents?Math.round(b.marketplace_config.max_amount_cents/100):5e4,{error:d}=await v.E.from("lender_policies").insert({client_id:o.id,display_name:c,tagline:null,avg_turnaround_days:2,min_credit_score:580,max_dsr_pct:45,min_amount:5e3,max_amount:a,min_years_in_operation:0,require_id_verified:!0,max_open_defaults:0,base_rate_pct:28,initiation_fee_pct:3,monthly_service_fee:69,rate_bands:[{minScore:700,rateAdjustment:-3},{minScore:650,rateAdjustment:-1},{minScore:580,rateAdjustment:0}],active:!1});d?console.error("[clients] marketplace policy seed failed",d):s=!0}let t=`https://${d}.algolend.co.za`;return(0,x.ZM)({to:f,subject:`Welcome to AlgoLend — your platform is ready`,html:(0,x.ui)({name:c,contact:g??f.split("@")[0],slug:d,portalUrl:t})}).catch(a=>console.error("[clients] welcome email failed:",a)),(0,y.A)({action:"client.create",resourceType:"client",resourceId:o.id,meta:{name:c,slug:d,tier:i}}),u.NextResponse.json({client:o,tenantUrl:t,featuresSeeded:!r,marketplacePolicyCreated:s},{status:201})}let D=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/clients/route",pathname:"/api/clients",filename:"route",bundlePath:"app/api/clients/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/Users/kurtvonschaeffer/mint-platform/apps/mint-admin/src/app/api/clients/route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:E,workUnitAsyncStorage:F,serverHooks:G}=D;function H(){return(0,g.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:F})}async function I(a,b,c){var d;let e="/api/clients/route";"/index"===e&&(e="/");let g=await D.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[C]);if(F&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||D.isDev||x||(G="/index"===(G=C)?"/":G);let H=!0===D.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>D.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>D.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await D.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})},z),b}},l=await D.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await D.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:A})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},61447:(a,b,c)=>{"use strict";c.d(b,{A:()=>f});var d=c(96048);let e={"client.create":"create","client.update":"update","client.suspend":"status_change","client.activate":"status_change","client.delete":"delete","invoice.create":"create","invoice.send":"update","invoice.mark_paid":"status_change","invoice.void":"status_change","lead.create":"create","lead.update":"update","feature.toggle":"config_change","quota.update":"config_change"};function f(a){let b=e[a.action];d.E.from("audit_log").insert({action:b,entity_type:a.resourceType,entity_id:a.resourceId??null,description:`${a.action}${a.actorEmail?` by ${a.actorEmail}`:""}`,after_data:a.meta??null,occurred_at:new Date().toISOString()}).then(({error:a})=>{a&&console.warn("[audit] insert failed:",a.message)})}},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},65936:(a,b,c)=>{"use strict";c.d(b,{BC:()=>m,KV:()=>j,ZM:()=>h,iu:()=>l,nR:()=>k,ui:()=>n,zE:()=>i});var d=c(71684);let e=process.env.RESEND_FROM_EMAIL??"AlgoLend <noreply@algolend.co.za>",f=process.env.RESEND_API_KEY,g=f?new d.u(f):null;async function h(a){if(!g)return console.log("[email] RESEND_API_KEY not set — would have sent:",a.subject,"→",a.to),{ok:!0,id:"simulated"};let{data:b,error:c}=await g.emails.send({from:e,...a});return c?(console.error("[email] send failed:",c),{ok:!1,error:c.message}):{ok:!0,id:b?.id}}function i(a){return`<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#d97706;padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">⚠️ API Quota Warning</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0">${a.clientName} \xb7 AlgoLend Platform</p>
  </div>
  <div style="padding:28px 32px">
    <p>Hi ${a.contact},</p>
    <p style="color:#555;line-height:1.6">Your AlgoLend deployment has used <strong>${a.pct}%</strong> of its monthly API quota.</p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="font-size:36px;font-weight:700;color:#d97706;margin:0">${a.pct}%</p>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${a.used.toLocaleString()} of ${a.limit.toLocaleString()} calls used this month</p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6">
      At current usage, you may reach your limit before the end of the month. Contact your AlgoLend account manager to top up your quota and avoid any service interruption.
    </p>
    <p style="color:#888;font-size:13px;margin-top:16px">
      Email <a href="mailto:support@mintplatforms.co.za" style="color:#7C3AED">support@mintplatforms.co.za</a> to arrange a top-up.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend \xb7 Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`}function j(a){return`<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#dc2626;padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">🚨 API Quota Exhausted — Service Paused</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0">${a.clientName} \xb7 AlgoLend Platform</p>
  </div>
  <div style="padding:28px 32px">
    <p>Hi ${a.contact},</p>
    <p style="color:#555;line-height:1.6">
      Your AlgoLend deployment has reached its monthly API quota of <strong>${a.limit.toLocaleString()} calls</strong>.
      External API calls (Experian, TruID, SureSystems) are <strong>blocked</strong> until your quota is topped up or the month resets.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
      <p style="font-size:36px;font-weight:700;color:#dc2626;margin:0">100%</p>
      <p style="color:#666;font-size:13px;margin:4px 0 0">${a.used.toLocaleString()} calls — monthly limit reached</p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6">
      <strong>To restore service immediately</strong>, contact your AlgoLend account manager to purchase additional quota. Your manager can add units within minutes.
    </p>
    <div style="margin-top:24px;text-align:center">
      <a href="mailto:support@mintplatforms.co.za?subject=Quota%20Top-Up%20Request%20—%20${encodeURIComponent(a.slug)}" style="background:#7C3AED;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
        Request Top-Up →
      </a>
    </div>
    <p style="color:#888;font-size:13px;margin-top:20px">Quota resets automatically on the 1st of next month.</p>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend \xb7 Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`}function k(a){let b=a=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR",minimumFractionDigits:2}).format(a/100);return`<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:32px;text-align:center">
    <p style="color:#fff;font-size:24px;font-weight:700;margin:0">AlgoLend</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:4px 0 0">Tax Invoice</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 8px">Hi ${a.contact},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      Please find your invoice for the period <strong>${a.periodStart} – ${a.periodEnd}</strong> attached below.
    </p>
    <div style="background:#f9f7ff;border:1px solid #e5e0ff;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7C3AED;margin:0 0 12px">${a.reference}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;color:#555">${a.lineCount} line item${1!==a.lineCount?"s":""}</td><td style="text-align:right;color:#888;font-size:13px">subtotal</td></tr>
        <tr><td style="padding:5px 0;color:#555">Subtotal</td><td style="text-align:right;font-weight:600">${b(a.subtotalCents)}</td></tr>
        <tr><td style="padding:5px 0;color:#555">VAT (15%)</td><td style="text-align:right">${b(a.vatCents)}</td></tr>
        <tr style="border-top:2px solid #7C3AED"><td style="padding:10px 0 0;font-weight:700;font-size:16px">Total Due</td><td style="text-align:right;font-weight:700;font-size:18px;color:#7C3AED;padding-top:10px">${b(a.totalCents)}</td></tr>
      </table>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6">Payment is due by <strong>${a.dueDate}</strong>. Please use <strong>${a.reference}</strong> as your payment reference.</p>
    <p style="color:#888;font-size:13px;margin-top:16px">Questions? Reply to this email or contact <a href="mailto:accounts@algolend.co.za" style="color:#7C3AED">accounts@algolend.co.za</a>.</p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend \xb7 Mint Platforms (Pty) Ltd \xb7 accounts@algolend.co.za
  </div>
</div>
</body></html>`}function l(a){let b="quota"===a.type?`Quota upgrade: <strong>${(a.currentQuota??0).toLocaleString()}</strong> → <strong>${(a.requestedQuota??0).toLocaleString()}</strong> calls/month`:`Feature request: <strong>${a.feature}</strong>`;return`<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:#7C3AED;padding:28px 32px">
    <p style="color:#fff;font-size:20px;font-weight:700;margin:0">Upgrade Request</p>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0">${a.clientName} — ${a.tier} tier</p>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#555;line-height:1.6">${b}</p>
    ${a.note?`<div style="background:#f9f7ff;border-left:3px solid #7C3AED;padding:12px 16px;margin:16px 0;font-size:14px;color:#555">"${a.note}"</div>`:""}
    <p style="color:#555;font-size:14px">Contact: <strong>${a.contact}</strong></p>
    <div style="margin-top:24px;text-align:center">
      <a href="https://admin.algolend.co.za/clients" style="background:#7C3AED;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
        View in Admin →
      </a>
    </div>
  </div>
  <div style="background:#f5f6fa;padding:16px;text-align:center;font-size:11px;color:#aaa">
    AlgoLend \xb7 Mint Platforms (Pty) Ltd — this is an internal notification
  </div>
</div>
</body></html>`}function m(a){return`<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:40px 32px;text-align:center">
    <p style="color:#fff;font-size:26px;font-weight:700;margin:0">You're invited to AlgoLend</p>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${a.clientName}</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px;margin:0 0 16px">Hi ${a.fullName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px">
      You've been invited to join <strong>${a.clientName}</strong> on the AlgoLend platform as a
      <strong>${({loan_officer:"Loan Officer",admin:"Administrator",viewer:"Viewer"})[a.role]??a.role}</strong>. Click the button below to set your password and get started.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${a.inviteUrl}" style="background:#7C3AED;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Accept invitation →
      </a>
    </div>
    <p style="color:#888;font-size:13px;text-align:center;margin:0">
      This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
    <p style="color:#aaa;font-size:12px;margin:0">
      Invited to: ${a.email}<br>
      Platform: <a href="https://admin.algolend.co.za" style="color:#7C3AED">admin.algolend.co.za</a>
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend \xb7 Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`}function n(a){return`<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1f36;background:#f5f6fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#7C3AED,#9B5CF6);padding:40px 32px;text-align:center">
    <p style="color:#fff;font-size:28px;font-weight:700;margin:0">Welcome to AlgoLend!</p>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">Your lending platform is ready</p>
  </div>
  <div style="padding:32px">
    <p style="font-size:16px">Hi ${a.contact},</p>
    <p style="color:#555;line-height:1.6">
      We're excited to welcome <strong>${a.name}</strong> to the AlgoLend platform. Your deployment is live and ready to use.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${a.portalUrl}" style="background:#7C3AED;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
        Access Your Portal →
      </a>
    </div>
    <p style="color:#888;font-size:13px">Your portal URL: <a href="${a.portalUrl}" style="color:#7C3AED">${a.portalUrl}</a></p>
    <p style="color:#555;line-height:1.6;margin-top:20px">
      Your dedicated account manager will be in touch shortly to walk you through the platform. In the meantime, feel free to reach out to <a href="mailto:support@mintplatforms.co.za" style="color:#7C3AED">support@mintplatforms.co.za</a>.
    </p>
  </div>
  <div style="background:#f5f6fa;padding:20px;text-align:center;font-size:12px;color:#aaa">
    AlgoLend \xb7 Mint Platforms (Pty) Ltd
  </div>
</div>
</body></html>`}},77333:(a,b,c)=>{"use strict";c.d(b,{o:()=>d});let d=["open_banking","e_contracts","credit_scoring","sacrra_bureau","multi_branch","working_capital","term_loans","invoice_finance","whatsapp_notify","advanced_analytics","sure_systems","biometric_kyc"]},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},96048:(a,b,c)=>{"use strict";c.d(b,{E:()=>i});var d=c(5825);let e="https://zpaqzzheqtrufemhpijn.supabase.co",f=process.env.SUPABASE_SERVICE_ROLE_KEY,g="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXF6emhlcXRydWZlbWhwaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODQ0MTcsImV4cCI6MjA5NDk2MDQxN30.EmHPRaXaEn8nRM8tmlp4Y6rD6dDmaqOpfTOcPNxZKcU";function h(a){process.env[a]||console.warn(`[supabase] Missing env var: ${a}`)}let i=e&&f?(0,d.UU)(e,f,{auth:{persistSession:!1}}):(h("NEXT_PUBLIC_SUPABASE_URL"),h("SUPABASE_SERVICE_ROLE_KEY"),null);e&&g?(0,d.UU)(e,g):h("NEXT_PUBLIC_SUPABASE_ANON_KEY")}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[7859,2938,5825,1684],()=>b(b.s=61166));module.exports=c})();