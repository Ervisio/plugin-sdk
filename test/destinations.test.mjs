import test from 'node:test';
import assert from 'node:assert/strict';
import { pickedDestination, DestinationFields } from '../destinations.js';

test('destination fields are an optional library component, not an SDK permission grant',()=>{
  assert.equal(typeof DestinationFields,'function');
  assert.deepEqual(pickedDestination('/srv/backups',[]),{kind:'local',connection:'',path:'/srv/backups'});
  assert.deepEqual(pickedDestination('C:\\Backups',[]),{kind:'local',connection:'',path:'C:\\Backups'});
});
test('the chooser only accepts known supported network connections',()=>{
  const id='a'.repeat(16);const entries=[{id,name:'SFTP',kind:'sftp'}];
  assert.deepEqual(pickedDestination(`remote:${id}:/snapshots`,entries),{kind:'remote',connection:id,path:'/snapshots'});
  assert.throws(()=>pickedDestination(`remote:${id}:/snapshots`,[]),/SFTP or SMB/);
  assert.throws(()=>pickedDestination(`remote:${id}:/snapshots`,[{id,name:'FTP',kind:'ftp'}]),/SFTP or SMB/);
  for(const path of ['relative/path','/bad\npath',null])assert.throws(()=>pickedDestination(path,entries));
});
