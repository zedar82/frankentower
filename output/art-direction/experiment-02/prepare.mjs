import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const root='output/art-direction/experiment-02';
const style=process.argv[2]??'a';
const measures=JSON.parse(await fs.readFile(`${root}/${style}/measurements.json`,'utf8'));
const categories={'skeleton-head':'head','human-arm':'arm','tentacle-arm':'arm','dog-leg':'leg',torso:'torso',maul:'weapon',boot:'footwear'};
const interfaces={head:'neck',arm:'shoulder',leg:'hip',weapon:'grip',footwear:'footwear'};
const browser=await chromium.launch({headless:true});
const metadata=[];
await fs.mkdir(`${root}/${style}/prepared`,{recursive:true});
try{
 const page=await browser.newPage();
 for(const [id,m]of Object.entries(measures)){
  const input=await fs.readFile(`${root}/${style}/originals/${id}.png`);
  const result=await page.evaluate(async({data,m})=>{
   const im=new Image();im.src=data;await im.decode();const source=document.createElement('canvas');source.width=im.width;source.height=im.height;const sc=source.getContext('2d');sc.drawImage(im,0,0);const pix=sc.getImageData(0,0,im.width,im.height).data;
   let x0=im.width,y0=im.height,x1=0,y1=0;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(pix[(y*im.width+x)*4+3]>=16){x0=Math.min(x,x0);y0=Math.min(y,y0);x1=Math.max(x,x1);y1=Math.max(y,y1);}
   const scale=m.target/m.diameter,pad=12,w=x1-x0+1,h=y1-y0+1;const out=document.createElement('canvas');out.width=Math.ceil(w*scale)+pad*2;out.height=Math.ceil(h*scale)+pad*2;out.getContext('2d').drawImage(im,x0,y0,w,h,pad,pad,w*scale,h*scale);
   const transform=([x,y])=>[+(pad+(x-x0)*scale).toFixed(3),+(pad+(y-y0)*scale).toFixed(3)];
   return{width:out.width,height:out.height,anchors:Object.fromEntries(Object.entries(m).filter(([k])=>['attachment','grip','footwear','headgear','chest'].includes(k)).map(([k,v])=>[k,transform(v)])),receiving:m.receiving&&Object.fromEntries(Object.entries(m.receiving).map(([k,v])=>[k,v.map(transform)])),preparation:{crop:[x0,y0,w,h],uniformScale:scale,padding:pad},png:out.toDataURL('image/png').split(',')[1]};
  },{data:`data:image/png;base64,${input.toString('base64')}`,m});
  await fs.writeFile(`${root}/${style}/prepared/${id}.png`,Buffer.from(result.png,'base64'));delete result.png;
  const category=categories[id]??(id.includes('head')?'head':id.includes('arm')?'arm':'torso');
  metadata.push({id,category,image:`prepared/${id}.png`,...result,interface:interfaces[category]?`${interfaces[category]}_standard_v1`:undefined,interfaceSize:category==='torso'?undefined:m.target,equipment:category==='head'?['head']:category==='arm'?['hand']:category==='leg'?['foot']:category==='torso'?['chest']:[],equipmentRotation:category==='weapon'?Math.PI/2:undefined,layer:category,status:'renderer-count-and-anchor-verified; visual-review-limited',source:`originals/${id}.png`});
 }
 await fs.writeFile(`${root}/${style}/catalogue.json`,JSON.stringify(metadata,null,2));
}finally{await browser.close();}


