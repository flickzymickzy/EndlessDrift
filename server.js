// No-install local web server for ENDLESS DRIFT. Node 18+ required.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT)||5173;
http.createServer(async(req,res)=>{
 try{
  const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+requestPath,requestPath.endsWith('/')?'index.html':'');
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const details=await stat(target);
  if(!details.isFile())throw Error('Not a file');
  const buffer=await readFile(target);
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(buffer);
 }catch(e){res.writeHead(404,{'Content-Type':'text/plain'});res.end('File not found');}
}).listen(port,'127.0.0.1',()=>{
 console.log('\n  ENDLESS DRIFT IS RUNNING\n');
 console.log('  Open in Safari: http://localhost:'+port+'/\n');
 console.log('  Keep Terminal open. Press Control+C to stop.\n');
}).on('error',e=>{if(e.code==='EADDRINUSE'){console.error('Port 5173 is already in use. Close the old game Terminal, then retry.');process.exitCode=1;}else throw e;});
