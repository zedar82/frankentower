import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const directory='output/art-direction/run-generation-study/style-reference-v2';
const job=JSON.parse(await readFile(directory+'/detail-prompt.json','utf8'));
const args=['generate','image','--game-id','mjkCVhrId815cvHaoaqj','--model',job.model,'--prompt',job.prompt,'--aspect-ratio','1:1','--reference-image',job.references[0],'--remove-background','--remove-background-model','birefnet','--out',directory+'/sources/'+job.id+'.png'];
const child=spawn('C:/Users/msn/AppData/Local/Programs/Rundot/rundot.exe',args,{stdio:'inherit',windowsHide:true});
child.once('exit',code=>process.exitCode=code??1);
child.once('error',error=>{console.error(error);process.exitCode=1;});
