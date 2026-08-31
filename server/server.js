"use strict";
require("dotenv").config();
const app=require("./app");
const S=require("./services/security");
const PORT=Number(process.env.PORT||8080), HOST=process.env.HOST||"0.0.0.0";
async function start(){await app.ready;app.listen(PORT,HOST,()=>{console.log("Prem Power Laundry Express API on http://%s:%d",HOST,PORT);console.log("  MongoDB        : connected");console.log("  owner emails   : %s",[...S.ADMIN_EMAILS].join(", ")||"(none)");console.log("  OTP            : 4 digits / push / 120 seconds");console.log("  session        : HttpOnly cookie / 7 days");});}
if(require.main===module)start().catch(err=>{console.error("Startup failed:",err&&err.stack?err.stack:err);process.exit(1);});
module.exports={app,start};
