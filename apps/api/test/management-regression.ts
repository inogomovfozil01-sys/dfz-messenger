import assert from 'node:assert/strict';
import express from 'express';
import { prisma } from '../src/prisma';
import { authService } from '../src/auth/auth.service';
import { chatsService } from '../src/chats/chats.service';
import { messagesService } from '../src/messages/messages.service';
import { managementRouter } from '../src/chats/management.controller';
import { searchRouter } from '../src/search/search.controller';
import { moderationRouter } from '../src/moderation/moderation.controller';
import { usersRouter } from '../src/users/users.controller';

async function main() {
  if (!process.env.DATABASE_URL?.includes('127.0.0.1:5432/dfz_rebuild_qa')) throw new Error('Dedicated local QA database required');
  const app=express(); app.use(express.json()); app.use('/api',managementRouter); app.use('/search',searchRouter); app.use('/moderation',moderationRouter);
  app.use('/users', usersRouter);
  app.use((err:any,_req:any,res:any,_next:any)=>res.status(err.status || (err.name==='ZodError'?400:500)).json({error:err.message}));
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const users:any[]=[];let group:any;
  try {
    for (let i=0;i<4;i++) users.push(await authService.register({username:`mgmt_${Date.now()}_${i}`,password:'LocalQaPassword2026!',displayName:'Management QA'}));
    const [a,b,c,d]=users;
    const request=async(u:any,path:string,method='GET',body?:any)=>{const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${u.accessToken}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,...await r.json() as any};};
    group=await chatsService.createGroup(a.user.id,{title:'Management QA',memberIds:[b.user.id]});const prefix=`/api/chats/${group.id}`;
    assert.equal((await request(b,prefix+'/policy','PUT',{sendMessages:false})).status,403);
    assert.equal((await request(a,prefix+'/policy','PUT',{sendMessages:false})).status,200);
    await assert.rejects(()=>messagesService.sendMessage(b.user.id,{chatId:group.id,content:'denied'}),(e:any)=>e.status===403);
    await request(a,prefix+'/policy','PUT',{sendMessages:true});
    const message=await messagesService.sendMessage(a.user.id,{chatId:group.id,content:'needle_private_history'});
    await chatsService.clearHistory(group.id,b.user.id);
    assert.equal((await request(b,'/search/global?q=needle_private_history')).data.messages.length,0);
    assert.equal((await request(a,'/search/global?q=needle_private_history')).data.messages.length,1);
    assert.equal((await request(b,`/search/chat/${group.id}?q=needle_private_history`)).data.length,0);
    assert.equal((await request(c,`/search/chat/${group.id}?q=needle`)).status,403);
    assert.equal((await request(c,'/moderation/report','POST',{targetType:'MESSAGE',targetId:message.id,reason:'SPAM'})).status,404);
    const invite=(await request(a,prefix+'/invites','POST',{name:'One use',usageLimit:1})).data;
    const joined=await Promise.all([c,d].map(u=>request(u,`/api/invites/${invite.code}/join`,'POST',{})));
    assert.deepEqual(joined.map(r=>r.status).sort(),[200,409]);
    assert.equal((await prisma.chatInvite.findUniqueOrThrow({where:{id:invite.id}})).usedCount,1);
    assert.equal((await request(b,prefix+'/draft','PUT',{content:'private draft'})).status,200);
    assert.equal((await request(a,prefix+'/draft')).data,null);
    assert.equal((await request(b,prefix+'/draft')).data.content,'private draft');
    assert.equal((await request(a,'/api/settings','PUT',{textSize:100})).status,400);
    await request(b,'/api/settings','PUT',{notifySound:false});
    assert.equal((await request(b,'/api/settings')).data.notifySound,false);
    assert.equal((await request(b,'/users/profile','PUT',{theme:'dim'})).status,200);
    assert.equal((await prisma.profile.findUniqueOrThrow({where:{userId:b.user.id}})).theme,'dim');
    console.log('PASS: management HTTP permissions, history search, report privacy, concurrent invite limits, draft isolation and settings validation');
  } finally {
    server.close();
    if(group) await prisma.chat.delete({where:{id:group.id}});
    const ids=users.map(u=>u.user.id);
    await prisma.userSettings.deleteMany({where:{userId:{in:ids}}});
    await prisma.auditLog.deleteMany({where:{actorId:{in:ids}}});
    await prisma.chat.deleteMany({where:{members:{some:{userId:{in:ids}}}}});
    await prisma.user.deleteMany({where:{id:{in:ids}}});
    await prisma.$disconnect();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
