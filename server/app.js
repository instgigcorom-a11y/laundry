"use strict";
const path=require("path");
require("dotenv").config({path:path.join(__dirname,".env")});
const express=require("express");
const cookieParser=require("cookie-parser");
const helmet=require("helmet");
const connectDB=require("./config/db");
const {ensureShop,ensureStarterServices}=require("./services/bootstrap");
const {ensureDatabaseIndexes}=require("./services/databaseIndexes");
const authRoutes=require("./routes/auth");
const profileRoutes=require("./routes/profile");
const ordersRoutes=require("./routes/orders");
const shopRoutes=require("./routes/shop");
const adminRoutes=require("./routes/admin");
const adminBusinessRoutes=require("./routes/adminBusiness");
const productsRoutes=require("./routes/products");
const paymentsRoutes=require("./routes/payments");

const app=express();
const ready=(async()=>{await connectDB();await ensureDatabaseIndexes();await ensureShop();await ensureStarterServices();})();

const ALLOWED_CORS_ORIGINS=new Set(
  String(process.env.CORS_ORIGINS||"")
    .split(",")
    .map(v=>String(v||"").trim())
    .filter(Boolean)
    .concat([
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "http://127.0.0.1:8080"
    ])
);

function allowCors(req,res,next){
  const origin=String(req.get("Origin")||"").trim();
  if(origin&&ALLOWED_CORS_ORIGINS.has(origin)){
    res.set("Access-Control-Allow-Origin",origin);
    res.set("Vary","Origin");
    res.set("Access-Control-Allow-Credentials","true");
    res.set("Access-Control-Allow-Headers","Accept, Content-Type, X-Admin-Token");
    res.set("Access-Control-Allow-Methods","GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if(req.method==="OPTIONS") return res.sendStatus(204);
  next();
}

app.ready=ready;
app.disable("x-powered-by");
app.use(helmet({contentSecurityPolicy:false}));
app.use(allowCors);
app.use(express.json({limit:"3mb"}));
app.use(cookieParser());
app.use("/api",async(req,res,next)=>{try{await ready;next();}catch(err){next(err);}});

app.use("/api/auth",authRoutes);
app.use("/api/me",profileRoutes);
app.use("/api/orders",ordersRoutes);
app.use("/api/products",productsRoutes);
app.use("/api/services/public",productsRoutes);
app.use("/api/payments",paymentsRoutes);
app.use("/api/shop",shopRoutes);
app.use("/api/admin",adminRoutes);
app.use("/api/admin",adminBusinessRoutes);
const clientDist=path.join(__dirname,"..","client","dist");
app.use(express.static(clientDist,{index:"index.html",maxAge:0}));
app.use(express.static(path.join(__dirname,"..","public"),{index:"index.html",maxAge:0}));
app.use("/api",(req,res)=>res.status(404).json({error:"not_found",message:"Unknown API endpoint."}));
app.use((err,req,res,next)=>{console.error("[error] %s %s — %s",req.method,req.originalUrl,err&&err.stack?err.stack:err);if(res.headersSent)return next(err);res.status(500).json({error:"server_error",message:"Something went wrong on the server."});});
module.exports=app;
