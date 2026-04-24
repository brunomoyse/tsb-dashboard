const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./CR5xf-Vn.js","./D5W0RE9U.js","./entry.DVKA8PkM.css"])))=>i.map(i=>d[i]);
import{u as o,_ as c,p as u}from"./D5W0RE9U.js";import{g as l}from"./DSOIV3Du.js";import{u as v}from"./Zw7dpR4N.js";const p=u(l`
    mutation ($deviceToken: String!, $platform: String!) {
        registerDeviceToken(deviceToken: $deviceToken, platform: $platform)
    }
`),g=u(l`
    mutation ($deviceToken: String!) {
        unregisterDeviceToken(deviceToken: $deviceToken)
    }
`),r="push_device_token";function h(){const{isCapacitor:a}=v(),{$gqlFetch:n}=o();async function m(){if(!a)return;const{PushNotifications:e}=await c(async()=>{const{PushNotifications:t}=await import("./CR5xf-Vn.js");return{PushNotifications:t}},__vite__mapDeps([0,1,2]),import.meta.url),i=await e.checkPermissions();i.receive!=="denied"&&(i.receive!=="granted"&&(await e.requestPermissions()).receive!=="granted"||(await e.addListener("registration",async t=>{if(localStorage.getItem(r)!==t.value)try{await n(p,{variables:{deviceToken:t.value,platform:"android"}}),localStorage.setItem(r,t.value)}catch{}}),await e.addListener("registrationError",()=>{}),await e.addListener("pushNotificationActionPerformed",t=>{const s=o().$router,f=o().$localePath;s.push(f("/orders"))}),await e.register()))}async function d(){if(!a)return;const e=localStorage.getItem(r);if(e){try{await n(g,{variables:{deviceToken:e}})}catch{}localStorage.removeItem(r)}try{const{PushNotifications:i}=await c(async()=>{const{PushNotifications:t}=await import("./CR5xf-Vn.js");return{PushNotifications:t}},__vite__mapDeps([0,1,2]),import.meta.url);await i.removeAllListeners()}catch{}}return{register:m,unregister:d}}export{h as usePushNotifications};
