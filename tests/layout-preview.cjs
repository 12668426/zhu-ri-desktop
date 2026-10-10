// Local-only visual QA. Iframes exercise real viewport sizes without changing
// the user's display settings. Theme replacements never change production CSS.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),width=Number(url.searchParams.get('width')),height=Number(url.searchParams.get('height'));
 res.setHeader('Content-Type','text/html;charset=utf-8');
 if(width>=320&&width<=2000&&height>=400&&height<=1400){
  const scale=Math.min(1,1200/width,700/height),theme=url.pathname==='/dark'?'/dark':'/';
  res.end(`<body style="margin:0"><iframe title="Desktop layout preview" src="${theme}" style="border:0;width:${width}px;height:${height}px;transform:scale(${scale});transform-origin:top left"></iframe></body>`);return;
 }
 let html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 if(url.pathname==='/dark')html=html.replaceAll(/prefers-color-scheme:\s*light/g,'max-width: 0px').replaceAll(/prefers-color-scheme:\s*dark/g,'min-width: 0px');
 res.end(html);
}).listen(8767,'127.0.0.1');
