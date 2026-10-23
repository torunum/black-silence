// Read the release, add inspection helpers to a private copy, leave it untouched.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const anchor='Jk();ju();Yy();X$(J$);D0t();';
const seam="window.__weaponStats=(index,pose)=>{Te.lastKey='';h0t(index,pose,90);return{visible:Te.image.data.some((v,i)=>i%4===3&&v>0),finite:Object.values(Te.anchors).every(a=>a.every(Number.isFinite)),png:Te.canvas.toDataURL()};};";
exports.prepare=(input,directory,name)=>{
 let html=fs.readFileSync(input,'utf8');
 if(html.split(anchor).length!==2)throw new Error('Expected one game startup anchor');
 if(!html.includes('window.__weaponStats='))html=html.replace(anchor,seam+'\n'+anchor);
 fs.mkdirSync(directory,{recursive:true});const output=path.join(directory,name+'.html');
 if(path.resolve(output)===path.resolve(input))throw new Error('QA fixture cannot overwrite the release');
 fs.writeFileSync(output,html);return pathToFileURL(output).href+'?qa=1';
};
