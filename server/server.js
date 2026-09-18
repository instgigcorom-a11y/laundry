"use strict";
const path=require("path");
require("dotenv").config({path:path.join(__dirname,".env")});
const http=require("http");
const app=require("./app");
const {pushConfig}=require("./services/pushNotifications");
const {attachRealtime}=require("./services/realtime");
const PORT=Number(process.env.PORT||8080), HOST=process.env.HOST||"0.0.0.0";
const server=http.createServer(app);
attachRealtime(server);
async function start(){await app.ready;server.listen(PORT,HOST,()=>{const push=pushConfig();console.log("Prem Power Laundry Express API on http://%s:%d",HOST,PORT);console.log("  MongoDB        : connected");console.log("  auth           : password + JWT session / 7 days");console.log("  live alerts    : Socket.IO ready");console.log("  push alerts    : %s",push.enabled?"configured":"disabled - "+push.message);});}
if(require.main===module)start().catch(err=>{console.error("Startup failed:",err&&err.stack?err.stack:err);process.exit(1);});
module.exports={app,server,start};
