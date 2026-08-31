import assert from 'node:assert/strict'
import test from 'node:test'
import { safeWordReplayBounds } from './pronunciation-replay'

test('word replay padding clamps safely to recording bounds',()=>{
  assert.deepEqual(safeWordReplayBounds({startMs:50,endMs:500},1),{startSeconds:0,endSeconds:.62})
  assert.deepEqual(safeWordReplayBounds({startMs:900,endMs:1200},1),{startSeconds:.78,endSeconds:1})
  assert.equal(safeWordReplayBounds({},1),null)
  assert.equal(safeWordReplayBounds({startMs:400,endMs:300},1),null)
})
