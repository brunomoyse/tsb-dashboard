import{g as i}from"./DSOIV3Du.js";import{useAuthStore as n}from"./CTWaRTVi.js";import{useOidc as m}from"./WfBp8Q-0.js";import{bn as c,u,p as l,bo as p}from"./D5W0RE9U.js";import"./Csyat_B_.js";const d=i`
    query {
        me {
            id
            email
            firstName
            lastName
            phoneNumber
            isAdmin
            address {
                id
                streetName
                houseNumber
                municipalityName
                postcode
                distance
            }
        }
    }
`;function A(){const t=n(),a=c(),{$gqlFetch:s}=u();async function o(){const{getAccessToken:r}=m();await r();const e=await s(l(d));return e?.me?e.me.isAdmin?(t.setUser(e.me),await p(a("orders")),{ok:!0}):(t.clearUser(),{ok:!1,reason:"not_admin"}):{ok:!1}}return{processCallback:o}}export{A as useAuthCallback};
